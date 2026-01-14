import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import './PersonnelManagement.css';
// No se importa el logo directamente, se accede a él a través de su ruta pública

const API_URL = 'http://localhost:3002'; // URL de tu backend

// Función para convertir números a letras en español
const numeroALetras = (num) => {
  const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  
  if (num === 0) return 'cero';
  if (num < 10) return unidades[num];
  if (num < 20) return especiales[num - 10];
  if (num < 100) {
    const decena = Math.floor(num / 10);
    const unidad = num % 10;
    if (unidad === 0) return decenas[decena];
    if (decena === 2) return `veinti${unidades[unidad]}`;
    return `${decenas[decena]} y ${unidades[unidad]}`;
  }
  if (num === 100) return 'cien';
  return num.toString(); // Para números mayores a 100, devolver el número
};

// Función helper para justificar texto manualmente - Justifica TODAS las líneas con algoritmo mejorado
const justifyText = (doc, text, x, y, maxWidth, lineHeight = 7) => {
  // Usar un ancho más preciso para mejor justificación
  const safeWidth = maxWidth - 0.5; // Reducir solo 0.5mm para mayor precisión
  const lines = doc.splitTextToSize(text, safeWidth);
  let currentY = y;

  lines.forEach((line, index) => {
    const words = line.trim().split(/\s+/);
    
    // Justificar todas las líneas que tengan más de una palabra
    if (words.length > 1) {
      // Calcular el ancho exacto del texto sin espacios
      let textWidth = 0;
      words.forEach(word => {
        textWidth += doc.getTextWidth(word);
      });
      
      const numberOfGaps = words.length - 1;
      const totalSpacesWidth = safeWidth - textWidth;
      
      if (numberOfGaps > 0 && totalSpacesWidth > 0) {
        const spaceCharWidth = doc.getTextWidth(' ');
        const totalSpacesNeeded = totalSpacesWidth / spaceCharWidth;
        const baseSpacesPerGap = Math.floor(totalSpacesNeeded / numberOfGaps);
        const extraSpaces = Math.round((totalSpacesNeeded / numberOfGaps - baseSpacesPerGap) * numberOfGaps);
        
        // Construir la línea justificada con distribución precisa de espacios
        let justifiedLine = words[0];
        for (let i = 1; i < words.length; i++) {
          // Distribuir espacios adicionales de manera más uniforme
          const spacesToAdd = baseSpacesPerGap + (i <= extraSpaces ? 1 : 0);
          const spaces = ' ' + ' '.repeat(spacesToAdd);
          justifiedLine += spaces + words[i];
        }
        
        // Verificar y ajustar si es necesario para mayor precisión
        let finalWidth = doc.getTextWidth(justifiedLine);
        const difference = safeWidth - finalWidth;
        
        // Si la diferencia es significativa, ajustar
        if (Math.abs(difference) > 0.2) {
          const wordsArray = justifiedLine.split(/\s+/);
          if (wordsArray.length > 1 && difference > 0) {
            // Necesitamos más espacio - añadir espacios adicionales
            const spacesToAdd = Math.ceil(difference / (wordsArray.length - 1) / doc.getTextWidth(' '));
            if (spacesToAdd > 0) {
              justifiedLine = wordsArray[0];
              for (let i = 1; i < wordsArray.length; i++) {
                justifiedLine += ' ' + ' '.repeat(spacesToAdd) + wordsArray[i];
              }
            }
          }
        }
        
        doc.text(justifiedLine, x, currentY, { align: 'left' });
      } else {
        doc.text(line, x, currentY, { align: 'left' });
      }
    } else {
      // Si solo hay una palabra, alinear a la izquierda
      doc.text(line, x, currentY, { align: 'left' });
    }
    currentY += lineHeight;
  });

  return currentY;
};

const PersonnelManagement = ({ departments, personnel, fetchPersonnel }) => {
  console.log('Componente PersonnelManagement renderizado');
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    id: null,
    cedula: '',
    nombre: '',
    cargo: '',
    departamento: '',
    telefono: '',
    email: '',
    fechaIngreso: '',
    salario: '',
    foto: null,
    vacacionesPorDisfrutar: '' // Nuevo campo, ahora como texto
  });
  const [isEditing, setIsEditing] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [departmentError, setDepartmentError] = useState('');

  useEffect(() => {
    if (isEditing && formData.foto) {
      setImagePreview(formData.foto);
    } else if (!isEditing) {
      setImagePreview(null);
    }
  }, [isEditing, formData.foto]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, foto: reader.result });
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFormData({ ...formData, foto: null });
      setImagePreview(null);
    }
  };

  const handleAddOrUpdatePersonnel = async (e) => {
    e.preventDefault();
    setDepartmentError('');

    const trimmedDepartmentName = formData.departamento.trim();
    const departmentExists = departments.some(dept => dept.name.toLowerCase() === trimmedDepartmentName.toLowerCase());
    if (!departmentExists) {
      setDepartmentError(`Error, el departamento '${trimmedDepartmentName}' no existe.`);
      return;
    }

    const token = localStorage.getItem('token'); // Obtener el token de localStorage
    console.log('Token enviado:', token); // Log del token antes de la solicitud

    try {
      let response;
      if (isEditing) {
        response = await fetch(`${API_URL}/personnel/${formData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Incluir el token JWT
          },
          body: JSON.stringify(formData)
        });
      } else {
        response = await fetch(`${API_URL}/personnel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // Incluir el token JWT
          },
          body: JSON.stringify(formData)
        });
      }

      const data = await response.json();
      console.log('Respuesta del servidor al guardar personal:', data); // Log de la respuesta completa
      if (response.ok) { // Verificar si la respuesta fue exitosa (status 2xx)
        if (data.message === 'success') {
          await fetchPersonnel(); // Recargar la lista de personal
          resetForm();
        } else {
          // Si el backend devuelve un mensaje de error en un caso "ok" (raro, pero posible)
          console.error('Error al guardar personal:', data.error || data.message || 'Error desconocido.');
          setDepartmentError(data.error || data.message || 'Error al guardar personal.');
        }
      } else {
        // Manejar errores de respuesta del servidor (ej. 401, 403, 400)
        const errorMessage = data.error || data.message || `Error del servidor: ${response.status} ${response.statusText}`;
        console.error('Error al guardar personal:', errorMessage);
        setDepartmentError(errorMessage);
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          navigate('/login'); // Redirigir al login si el token es inválido o expirado
        }
      }
    } catch (error) {
      console.error('Error de red al guardar personal:', error);
      setDepartmentError('Error de red al guardar personal. Verifique su conexión.');
    }
  };

  const handleEditPersonnel = (person) => {
    setFormData(person);
    setIsEditing(true);
  };

  const handleDeletePersonnel = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar a este miembro del personal?')) {
      const token = localStorage.getItem('token'); // Obtener el token de localStorage
      try {
        const response = await fetch(`${API_URL}/personnel/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}` // Incluir el token JWT
          }
        });
        const data = await response.json();
        if (response.ok) { // Verificar si la respuesta fue exitosa (status 2xx)
          if (data.message === 'success') {
            await fetchPersonnel(); // Recargar la lista de personal
          } else {
            console.error('Error al eliminar personal:', data.error);
            alert('Error al eliminar personal: ' + (data.error || 'Desconocido'));
          }
        } else {
          console.error('Error al eliminar personal:', data.message || response.statusText);
          alert('Error al eliminar personal: ' + (data.message || `Error del servidor: ${response.status}`));
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            navigate('/login'); // Redirigir al login si el token es inválido o expirado
          }
        }
      } catch (error) {
        console.error('Error de red al eliminar personal:', error);
        alert('Error de red al eliminar personal.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      cedula: '',
      nombre: '',
      cargo: '',
      departamento: '',
      telefono: '',
      email: '',
      fechaIngreso: '',
      salario: '',
      foto: null,
      vacacionesPorDisfrutar: '' // Limpiar también este campo
    });
    setIsEditing(false);
    setImagePreview(null);
  };

  const handleGenerateCertificate = (person) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Añadir el logo en la parte superior derecha (más pequeño)
    try {
      doc.addImage('/logo-clebg.jpg', 'JPEG', pageWidth - 60, 10, 50, 20);
    } catch (error) {
      console.warn('No se pudo cargar el logo:', error);
    }

    // Encabezado centrado
    doc.setFontSize(10);
    doc.text('República Bolivariana de Venezuela', pageWidth / 2, 15, { align: 'center' });
    doc.text('Consejo Legislativo del Estado Bolivariano de Guárico', pageWidth / 2, 20, { align: 'center' });
    doc.text('Dirección De Gestión Humana', pageWidth / 2, 25, { align: 'center' });
    doc.text('R.I.F. G-20000485-1', pageWidth / 2, 30, { align: 'center' });

    // Título
    doc.setFontSize(16);
    doc.text('CONSTANCIA', pageWidth / 2, 50, { align: 'center' });

    // Cuerpo del texto (justificado) - Formato exacto según la imagen
    // Usar fuente Times (serif) para mejor justificación
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    
    // Formatear fecha de ingreso
    let fechaIngresoFormateada = '';
    if (person.fechaIngreso) {
      const fechaIngreso = new Date(person.fechaIngreso);
      fechaIngresoFormateada = fechaIngreso.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    }
    
    // Determinar género basado en el nombre (simple: si termina en 'a' probablemente es femenino)
    const esFemenino = person.nombre && person.nombre.trim().toLowerCase().endsWith('a');
    const genero = esFemenino ? 'la Ciudadana' : 'el Ciudadano';
    
    // Formato exacto según la imagen
    const text = `Quien suscribe, Dr. LUIS EDUARDO MORENO, titular de la Cédula de Identidad N° V-11.116.500, en mi carácter de Director de Gestión Humana del Consejo Legislativo del Estado Bolivariano de Guárico (CLEBG), por medio de la presente hago constar que ${genero}: ${person.nombre || 'xxxxx'}, titular de la cedula de identidad N° V°${person.cedula || 'xxxxxx'}, se encuentra adscrito a esta dependencia desempeñándose como: ${person.cargo || 'xxxxxx'}, con fecha de ingreso: ${fechaIngresoFormateada || 'xxxxx'}, en la nómina ${person.departamento ? 'de: ' + person.departamento : 'xx de: xxxx'}, devengando un sueldo mensual de Bs. ${person.salario || 'xxxx'}.`;
    
    const marginLeft = 20;
    const marginRight = 20;
    const textWidth = pageWidth - marginLeft - marginRight;
    const finalYBodyText = justifyText(doc, text, marginLeft, 70, textWidth);

    // Fecha y lugar de emisión (justificado y en negrita)
    const today = new Date();
    const day = today.getDate();
    const dayInWords = numeroALetras(day);
    const month = today.toLocaleString('es-ES', { month: 'long' });
    const year = today.getFullYear();
    
    doc.setFont('times', 'bold');
    const dateText = `Constancia que se expide a petición de parte interesada, en San Juan de los Morros a los ${dayInWords} (${day}) días del mes de ${month} de ${year}.`;
    const finalYDateText = justifyText(doc, dateText, marginLeft, finalYBodyText + 10, textWidth);
    doc.setFont('times', 'normal');

    // Firma
    doc.setFontSize(12);
    const signatureLines = [
      'Dr. Luis Eduardo Moreno',
      'Director de Gestión Humana',
      'Del Consejo Legislativo del Estado',
      'Bolivariano Guárico.'
    ];

    // Dejar espacio para firma y sello en el centro
    let signatureY = finalYDateText + 50;
    signatureLines.forEach(line => {
      doc.text(line, pageWidth / 2, signatureY, { align: 'center' });
      signatureY += 6;
    });

    // Email después de la firma
    doc.text('RRHHCLEG@gmail.com', pageWidth / 2, signatureY, { align: 'center' });

    // Pie de página
    doc.setFontSize(8);
    doc.text('Año 207 de la Independencia, Año 157 de la federación y 18 de la Revolución Bolivariana.', pageWidth / 2, pageHeight - 20, { align: 'center' });
    doc.text('Palacio Legislativo. Av. Miranda, Sector la Redoma. Urb. La tropical. San Juan de los Morros. Estado Bolivariano de Guárico. Teléfono: 0246-4319696 y 0424-306-55-30', pageWidth / 2, pageHeight - 15, { align: 'center' });

    doc.save(`Constancia_Trabajo_${person.nombre || 'Personal'}.pdf`);
  };

  return (
    <div className="personnel-management">
      <button onClick={() => navigate(-1)} className="back-button">Regresar</button> {/* Botón de regresar */}
      <h2>Gestionar Personal</h2>

      <form onSubmit={handleAddOrUpdatePersonnel} className="personnel-form">
        <input
          type="text"
          name="cedula"
          value={formData.cedula}
          onChange={handleInputChange}
          placeholder="Cédula"
          required
        />
        <input
          type="text"
          name="nombre"
          value={formData.nombre}
          onChange={handleInputChange}
          placeholder="Nombre Completo"
          required
        />
        <input
          type="text"
          name="cargo"
          value={formData.cargo}
          onChange={handleInputChange}
          placeholder="Cargo"
          required
        />
        <input
          type="text"
          name="departamento"
          value={formData.departamento}
          onChange={handleInputChange}
          placeholder="Departamento"
          required
        />
        {departmentError && <div className="error-message">{departmentError}</div>} {/* Mostrar mensaje de error */}
        <input
          type="text"
          name="telefono"
          value={formData.telefono}
          onChange={handleInputChange}
          placeholder="Teléfono"
        />
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="Email"
        />
        <input
          type="date"
          name="fechaIngreso"
          value={formData.fechaIngreso}
          onChange={handleInputChange}
          placeholder="Fecha de Ingreso"
        />
        <input
          type="text"
          name="salario"
          value={formData.salario}
          onChange={handleInputChange}
          placeholder="Salario"
        />
        <input
          type="text"
          name="vacacionesPorDisfrutar"
          value={formData.vacacionesPorDisfrutar}
          onChange={handleInputChange}
          placeholder="Vacaciones por disfrutar (ej: Periodo 2025)"
        />
        <div className="form-group">
          <label htmlFor="foto">Foto del Personal:</label>
          <input
            type="file"
            id="foto"
            name="foto"
            accept="image/*"
            onChange={handleImageChange}
          />
          {imagePreview && (
            <img src={imagePreview} alt="Previsualización" className="image-preview" />
          )}
        </div>
        <button type="submit">{isEditing ? 'Actualizar Personal' : 'Agregar Personal'}</button>
        {isEditing && <button type="button" onClick={() => { setIsEditing(false); setImagePreview(null); }}>Cancelar</button>}
      </form>

      <h3>Lista de Personal</h3>
      <div className="personnel-list-table">
        <table>
          <thead>
            <tr>
              <th>Foto</th>
              <th>Cédula</th>
              <th>Nombre</th>
              <th>Cargo</th>
              <th>Departamento</th>
              <th>Vacaciones</th> {/* Nueva columna */}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {personnel.map(person => (
              <tr key={person.id}>
                <td>{person.foto && <img src={person.foto} alt={person.nombre} className="personnel-photo-thumbnail" />}</td>
                <td>{person.cedula}</td>
                <td>{person.nombre}</td>
                <td>{person.cargo}</td>
                <td>{person.departamento}</td>
                <td>{person.vacacionesPorDisfrutar}</td> {/* Mostrar vacaciones como texto */}
                <td>
                  <button onClick={() => handleEditPersonnel(person)}>Editar</button>
                  <button onClick={() => handleDeletePersonnel(person.id)}>Eliminar</button>
                  <button onClick={() => {
                    console.log('Botón Generar Constancia clicado');
                    try {
                      handleGenerateCertificate(person);
                    } catch (error) {
                      console.error('Error al intentar generar constancia:', error);
                      alert('Error al generar constancia. Verifique la consola para más detalles.');
                    }
                  }}>Generar Constancia</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PersonnelManagement;
