import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf'; // Importar jsPDF
import './PersonnelSearch.css';

const API_URL = 'http://localhost:3002'; // URL de tu backend

const getEmptyVisitorForm = () => ({
  nombreCompleto: '',
  cedula: '',
  departamentoDestino: '',
  motivo: '',
  horaEntrada: '',
  horaSalida: '',
  horaSalidaPorDefinir: false // Nuevo campo
});
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

const PersonnelSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visitorFormVisible, setVisitorFormVisible] = useState(false);
  const [visitorFormData, setVisitorFormData] = useState(getEmptyVisitorForm);
  const [visitorMessage, setVisitorMessage] = useState({ type: '', text: '' });
  const [visitorSubmitting, setVisitorSubmitting] = useState(false);
  const [visits, setVisits] = useState([]);
  const [horaSalidaPorDefinir, setHoraSalidaPorDefinir] = useState(false); // Nuevo estado
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsError, setVisitsError] = useState('');
  const [editingVisitId, setEditingVisitId] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSearchResult(null);

    try {
      const response = await fetch(`${API_URL}/personnel/${searchTerm.trim()}`);
      const data = await response.json();

      if (response.ok && data.message === 'success') {
        setSearchResult(data.data);
      } else {
        setError(data.message || 'No se encontró personal con el número de cédula ingresado.');
      }
    } catch (error) {
      console.error('Error de red al buscar personal:', error);
      setError('Error de red al buscar personal.');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResult(null);
    setError('');
  };

  const fetchVisits = async () => {
    setVisitsLoading(true);
    setVisitsError('');
    try {
      const response = await fetch(`${API_URL}/visits`);
      const data = await response.json();
      if (response.ok && data.message === 'success') {
        setVisits(data.data);
      } else {
        setVisitsError(data.message || 'No se pudieron obtener los registros.');
      }
    } catch (err) {
      console.error('Error al obtener visitas:', err);
      setVisitsError('Error de red al obtener los registros.');
    } finally {
      setVisitsLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const toggleVisitorForm = () => {
    setVisitorFormVisible((prev) => !prev);
    setVisitorMessage({ type: '', text: '' });
    if (!visitorFormVisible) {
      setVisitorFormData(getEmptyVisitorForm());
      setEditingVisitId(null);
      setHoraSalidaPorDefinir(false); // Resetear estado del checkbox al abrir/cerrar
    }
  };

  const handleVisitorInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'horaSalidaPorDefinir') {
      setHoraSalidaPorDefinir(checked);
      setVisitorFormData((prev) => ({
        ...prev,
        horaSalidaPorDefinir: checked,
        horaSalida: checked ? 'Por Definir' : '' // Setear a 'Por Definir' o limpiar
      }));
    } else {
      setVisitorFormData({ ...visitorFormData, [name]: value });
    }
  };

  const handleVisitorSubmit = async (e) => {
    e.preventDefault();
    setVisitorMessage({ type: '', text: '' });

    const { nombreCompleto, cedula, departamentoDestino, motivo, horaEntrada } = visitorFormData;
    if (!nombreCompleto.trim() || !cedula.trim() || !departamentoDestino.trim() || !motivo.trim() || !horaEntrada || (!visitorFormData.horaSalida && !horaSalidaPorDefinir)) {
      setVisitorMessage({ type: 'error', text: 'Por favor complete todos los campos antes de registrar.' });
      return;
    }

    const finalVisitorFormData = {
      ...visitorFormData,
      horaSalida: horaSalidaPorDefinir ? 'Por Definir' : visitorFormData.horaSalida
    };

    try {
      setVisitorSubmitting(true);
      const isEditing = editingVisitId !== null;
      const url = isEditing ? `${API_URL}/visits/${editingVisitId}` : `${API_URL}/visits`;
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(finalVisitorFormData)
      });
      const data = await response.json();

      if (response.ok && data.message === 'success') {
        setVisitorMessage({ type: 'success', text: isEditing ? 'Visitante actualizado correctamente.' : 'Visitante registrado correctamente.' });
        setVisitorFormData(getEmptyVisitorForm());
        setVisitorFormVisible(false);
        setEditingVisitId(null);
        fetchVisits();
      } else {
        const errorText = data.message || (isEditing ? 'No se pudo actualizar la visita, intente nuevamente.' : 'No se pudo registrar la visita, intente nuevamente.');
        setVisitorMessage({ type: 'error', text: errorText });
      }
    } catch (storageError) {
      console.error('Error al guardar visitante en servidor:', storageError);
      setVisitorMessage({ type: 'error', text: editingVisitId ? 'No se pudo actualizar el registro del visitante.' : 'No se pudo guardar el registro del visitante.' });
    } finally {
      setVisitorSubmitting(false);
    }
  };

  const handleEditVisit = (visit) => {
    setVisitorFormData({
      nombreCompleto: visit.nombreCompleto || '',
      cedula: visit.cedula || '',
      departamentoDestino: visit.departamentoDestino || '',
      motivo: visit.motivo || '',
      horaEntrada: visit.horaEntrada || '',
      horaSalida: visit.horaSalida === 'Por Definir' ? '' : visit.horaSalida || '', // Limpiar si es "Por Definir"
      horaSalidaPorDefinir: visit.horaSalida === 'Por Definir' // Marcar checkbox si es "Por Definir"
    });
    setHoraSalidaPorDefinir(visit.horaSalida === 'Por Definir'); // Sincronizar estado del checkbox
    setEditingVisitId(visit.id);
    setVisitorFormVisible(true);
    setVisitorMessage({ type: '', text: '' });
  };

  const handleDownloadVisitsPdf = () => {
    if (visits.length === 0) {
      setVisitorMessage({ type: 'error', text: 'No hay registros del día para descargar.' });
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    const margin = 14;
    const today = new Date();
    doc.setFontSize(16);
    doc.text('Reporte diario de visitantes', margin, 15);
    doc.setFontSize(10);
    doc.text(
      today.toLocaleString('es-VE', {
        dateStyle: 'full',
        timeStyle: 'short'
      }),
      margin,
      20
    );

    const columns = [
      { label: 'Nombre completo', key: 'nombreCompleto', width: 60 },
      { label: 'Cédula', key: 'cedula', width: 30 },
      { label: 'Departamento destino', key: 'departamentoDestino', width: 50 },
      { label: 'Motivo', key: 'motivo', width: 60 },
      { label: 'Entrada', key: 'horaEntrada', width: 20 },
      { label: 'Salida', key: 'horaSalida', width: 20 },
      { label: 'Registrado', key: 'fechaRegistro', width: 45 }
    ];

    const columnPositions = [];
    columns.reduce((current, column) => {
      columnPositions.push(current);
      return current + column.width;
    }, margin);

    let currentY = 30;
    const lineHeight = 6;

    const renderRow = (values, isHeader = false) => {
      const processed = values.map((value, idx) =>
        doc.splitTextToSize(value || '-', columns[idx].width - 2)
      );
      const rowHeight = Math.max(...processed.map((val) => val.length || 1)) * lineHeight + 2;

      if (currentY + rowHeight > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        currentY = margin;
      }

      doc.setFont(undefined, isHeader ? 'bold' : 'normal');
      processed.forEach((textLines, idx) => {
        doc.text(textLines, columnPositions[idx], currentY);
      });
      currentY += rowHeight;
    };

    renderRow(columns.map((col) => col.label), true);
    visits.forEach((visit) => {
      renderRow(
        columns.map((col) => {
          if (col.key === 'fechaRegistro' && visit.fechaRegistro) {
            return new Date(visit.fechaRegistro).toLocaleString('es-VE', {
              dateStyle: 'short',
              timeStyle: 'short'
            });
          }
          return String(visit[col.key] || '');
        })
      );
    });

    const formattedDate = today.toISOString().split('T')[0];
    doc.save(`Visitantes_${formattedDate}.pdf`);
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
    <div className="personnel-search">
      <div className="search-header">
        <h2>🔍 Búsqueda de Personal</h2>
        <p>Ingrese el número de cédula para consultar los datos del personal</p>
      </div>

      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-group">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ingrese número de cédula (ej: 12345678)"
            className="search-input"
            required
            disabled={loading}
          />
          <button 
            type="submit" 
            className="btn btn-primary search-btn"
            disabled={loading || !searchTerm.trim()}
          >
            {loading ? '🔍 Buscando...' : '🔍 Buscar'}
          </button>
        </div>
      </form>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {searchResult && (
        <div className="search-result">
          <div className="result-header">
            <h3>📋 Datos del Personal</h3>
            <button onClick={clearSearch} className="btn btn-secondary clear-btn">
              ✕ Limpiar
            </button>
            <button onClick={() => handleGenerateCertificate(searchResult)} className="btn btn-primary generate-certificate-btn">
              Generar Constancia
            </button>
          </div>
          
          <div className="personnel-card">
            <div className="personnel-avatar">
              {searchResult.foto ? (
                <img src={searchResult.foto} alt={searchResult.nombre} className="personnel-photo-display" />
              ) : (
                <span className="avatar-icon">👤</span>
              )}
            </div>
            
            <div className="personnel-info">
              <div className="info-row">
                <span className="label">Nombre Completo:</span>
                <span className="value">{searchResult.nombre}</span>
              </div>
              
              <div className="info-row">
                <span className="label">Cédula:</span>
                <span className="value">{searchResult.cedula}</span>
              </div>
              
              <div className="info-row">
                <span className="label">Cargo:</span>
                <span className="value">{searchResult.cargo}</span>
              </div>
              
              <div className="info-row">
                <span className="label">Departamento:</span>
                <span className="value dept-badge">{searchResult.departamento}</span>
              </div>
              
              <div className="info-row">
                <span className="label">Teléfono:</span>
                <span className="value">{searchResult.telefono}</span>
              </div>
              
              <div className="info-row">
                <span className="label">Email:</span>
                <span className="value">{searchResult.email}</span>
              </div>
              
              <div className="info-row">
                <span className="label">Fecha de Ingreso:</span>
                <span className="value">{new Date(searchResult.fechaIngreso).toLocaleDateString('es-ES')}</span>
              </div>
              
              <div className="info-row">
                <span className="label">Salario:</span>
                <span className="value salary">{searchResult.salario}</span>
              </div>
              
              <div className="info-row">
                <span className="label">Vacaciones por disfrutar:</span>
                <span className="value">{searchResult.vacacionesPorDisfrutar}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="visitor-registration">
        <div className="visitor-header">
          <h4>📝 Control de visitantes</h4>
          <div className="visitor-actions">
            <button
              type="button"
              className="btn visitor-btn"
              onClick={toggleVisitorForm}
            >
              {visitorFormVisible ? 'Cerrar formulario' : (editingVisitId ? 'Editar visitante' : 'Registrar visitante')}
            </button>
            <button
              type="button"
              className="btn visitor-btn secondary"
              onClick={handleDownloadVisitsPdf}
              disabled={visits.length === 0}
            >
              Descargar PDF
            </button>
          </div>
        </div>

        {visitorFormVisible && (
          <form className="visitor-form" onSubmit={handleVisitorSubmit}>
            <div className="visitor-form-grid">
              <div className="visitor-field">
                <label>Nombre completo</label>
                <input
                  type="text"
                  name="nombreCompleto"
                  value={visitorFormData.nombreCompleto}
                  onChange={handleVisitorInputChange}
                  placeholder="Ingrese el nombre completo"
                  required
                />
              </div>
              <div className="visitor-field">
                <label>Cédula</label>
                <input
                  type="text"
                  name="cedula"
                  value={visitorFormData.cedula}
                  onChange={handleVisitorInputChange}
                  placeholder="Ej: 12345678"
                  required
                />
              </div>
              <div className="visitor-field">
                <label>Departamento al que se dirige</label>
                <input
                  type="text"
                  name="departamentoDestino"
                  value={visitorFormData.departamentoDestino}
                  onChange={handleVisitorInputChange}
                  placeholder="Ej: Dirección de Gestión Humana"
                  required
                />
              </div>
            </div>

            <div className="visitor-field">
              <label>Motivo de visita</label>
              <textarea
                name="motivo"
                value={visitorFormData.motivo}
                onChange={handleVisitorInputChange}
                placeholder="Describa brevemente el motivo de la visita"
                rows="3"
                required
              ></textarea>
            </div>

            <div className="visitor-form-grid">
              <div className="visitor-field">
                <label>Hora de entrada</label>
                <input
                  type="time"
                  name="horaEntrada"
                  value={visitorFormData.horaEntrada}
                  onChange={handleVisitorInputChange}
                  required
                />
              </div>
              <div className="visitor-field">
                <label>Hora de salida</label>
                <input
                  type="time"
                  name="horaSalida"
                  value={visitorFormData.horaSalida}
                  onChange={handleVisitorInputChange}
                  required={!horaSalidaPorDefinir} // No requerido si "Por Definir" está marcado
                  disabled={horaSalidaPorDefinir} // Deshabilitar si "Por Definir" está marcado
                />
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    id="horaSalidaPorDefinir"
                    name="horaSalidaPorDefinir"
                    checked={horaSalidaPorDefinir}
                    onChange={handleVisitorInputChange}
                  />
                  <label htmlFor="horaSalidaPorDefinir">Por Definir</label>
                </div>
              </div>
            </div>

            <div className="visitor-form-actions">
              <button type="submit" className="btn btn-primary" disabled={visitorSubmitting}>
                {visitorSubmitting ? (editingVisitId ? 'Actualizando...' : 'Guardando...') : (editingVisitId ? 'Actualizar registro' : 'Guardar registro')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setVisitorFormData(getEmptyVisitorForm());
                  setVisitorFormVisible(false);
                  setEditingVisitId(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {visitorMessage.text && (
          <div className={`visitor-message ${visitorMessage.type}`}>
            {visitorMessage.text}
          </div>
        )}

        <div className="visitor-report">
          <div className="visitor-header">
            <h4>📊 Reporte de visitantes</h4>
            <div className="visitor-actions">
              <button
                type="button"
                className="btn visitor-btn"
                onClick={fetchVisits}
                disabled={visitsLoading}
              >
                {visitsLoading ? 'Actualizando...' : 'Actualizar'}
              </button>
              <button
                type="button"
                className="btn visitor-btn secondary"
                onClick={handleDownloadVisitsPdf}
                disabled={visits.length === 0}
              >
                Descargar PDF
              </button>
            </div>
          </div>

          {visitsError && <div className="visitor-message error">{visitsError}</div>}

          {visitsLoading ? (
            <p className="visitor-report-placeholder">Cargando registros...</p>
          ) : visits.length === 0 ? (
            <p className="visitor-report-placeholder">Aún no hay visitantes registrados.</p>
          ) : (
            <div className="visitor-table-wrapper">
              <table className="visitor-table">
                <thead>
                  <tr>
                    <th>Nombre completo</th>
                    <th>Cédula</th>
                    <th>Departamento destino</th>
                    <th>Motivo</th>
                    <th>Hora de entrada</th>
                    <th>Hora de salida</th>
                    <th>Fecha registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => (
                    <tr key={visit.id}>
                      <td>{visit.nombreCompleto}</td>
                      <td>{visit.cedula}</td>
                      <td>{visit.departamentoDestino}</td>
                      <td>{visit.motivo}</td>
                      <td>{visit.horaEntrada}</td>
                      <td className={visit.horaSalida === 'Por Definir' ? 'hora-salida-por-definir' : 'hora-salida-definida'}>
                        {visit.horaSalida}
                      </td>
                      <td>
                        {visit.fechaRegistro
                          ? new Date(visit.fechaRegistro).toLocaleString('es-VE', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })
                          : '—'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-primary visitor-edit-btn"
                          onClick={() => handleEditVisit(visit)}
                          disabled={editingVisitId === visit.id}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonnelSearch;
