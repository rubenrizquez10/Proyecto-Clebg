import React, { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import PersonnelSearch from './PersonnelSearch';
import './Dashboard.css';

const API_URL = 'http://localhost:3002'; // URL de tu backend

const Dashboard = ({ onLogout }) => {
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentPersonnel, setDepartmentPersonnel] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allPersonnel, setAllPersonnel] = useState([]); // Para almacenar todo el personal

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/departments`);
      const data = await response.json();
      if (data.message === 'success') {
        setDepartments(data.data);
      } else {
        console.error('Error al cargar departamentos en Dashboard:', data.error);
      }
    } catch (error) {
      console.error('Error de red al cargar departamentos en Dashboard:', error);
    }
  }, []);

  const fetchAllPersonnel = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/personnel`);
      const data = await response.json();
      if (data.message === 'success') {
        setAllPersonnel(data.data);
      } else {
        console.error('Error al cargar todo el personal en Dashboard:', data.error);
      }
    } catch (error) {
      console.error('Error de red al cargar todo el personal en Dashboard:', error);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchAllPersonnel();
  }, [fetchDepartments, fetchAllPersonnel]);

  const buildDepartmentPersonnel = useCallback(
    (department, personnelList) => {
      if (!department) {
        return [];
      }
      return personnelList.filter(
        (person) =>
          person.departamento &&
          person.departamento.toLowerCase() === department.name.toLowerCase()
      );
    },
    []
  );

  const handleDepartmentClick = (department) => {
    setSelectedDepartment(department);
    setDepartmentPersonnel(buildDepartmentPersonnel(department, allPersonnel));
  };

  const handleBackToDepartments = () => {
    setSelectedDepartment(null);
    setDepartmentPersonnel([]);
  };

  useEffect(() => {
    if (selectedDepartment) {
      setDepartmentPersonnel(buildDepartmentPersonnel(selectedDepartment, allPersonnel));
    }
  }, [selectedDepartment, allPersonnel, buildDepartmentPersonnel]);

  const handlePrintDepartmentPdf = () => {
    if (!selectedDepartment || departmentPersonnel.length === 0) {
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    const margin = 14;
    const pageHeight = doc.internal.pageSize.getHeight();
    const columns = [
      { label: 'Cédula', key: 'cedula', width: 30 },
      { label: 'Nombre', key: 'nombre', width: 60 },
      { label: 'Cargo', key: 'cargo', width: 45 },
      { label: 'Teléfono', key: 'telefono', width: 35 },
      { label: 'Email', key: 'email', width: 70 },
      { label: 'Vacaciones', key: 'vacacionesPorDisfrutar', width: 45 }
    ];

    const columnPositions = [];
    columns.reduce((current, column) => {
      columnPositions.push(current);
      return current + column.width;
    }, margin);

    let currentY = 25;
    const lineHeight = 6;

    doc.setFontSize(16);
    doc.text(`Listado de personal - ${selectedDepartment.name}`, margin, 15);
    doc.setFontSize(10);
    doc.text(`Total de registros: ${departmentPersonnel.length}`, margin, 20);

    const renderRow = (values, isHeader = false) => {
      const splittedValues = values.map((value, index) =>
        doc.splitTextToSize(value || '-', columns[index].width - 2)
      );
      const rowHeight = Math.max(...splittedValues.map((val) => val.length || 1)) * lineHeight + 2;

      if (currentY + rowHeight > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }

      doc.setFont(undefined, isHeader ? 'bold' : 'normal');
      splittedValues.forEach((textLines, idx) => {
        doc.text(textLines, columnPositions[idx], currentY);
      });
      currentY += rowHeight;
    };

    renderRow(columns.map((column) => column.label), true);
    doc.setFont(undefined, 'normal');
    departmentPersonnel.forEach((person) => {
      renderRow(columns.map((column) => String(person[column.key] || '')));
    });

    doc.save(`Listado_${selectedDepartment.name}.pdf`);
  };

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <img src="/logo.jpg" alt="Logo CLEBG" className="header-logo" />
          </div>
          <div className="header-buttons"> {/* Nuevo contenedor para los botones */}
            <a href="/admin" className="btn admin-btn">
              Configuración
            </a>
            <button onClick={onLogout} className="btn logout-btn">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="container">
          <div className="welcome-section">
            <h1>Bienvenido a SIGHFY</h1>
            <p>Seleccione un departamento para acceder a sus funciones específicas:</p>
          </div>

          <PersonnelSearch />

          {selectedDepartment ? (
            <div className="department-detail-view">
              <button onClick={handleBackToDepartments} className="btn btn-secondary back-btn">
                ← Volver a Departamentos
              </button>
              <h2>{selectedDepartment.icon} {selectedDepartment.name}</h2>
              <p>{selectedDepartment.description}</p>

              <div className="department-personnel-section">
                <div className="section-header">
                  <h3>Lista de Personal en {selectedDepartment.name}</h3>
                  <button
                    className="btn print-btn"
                    onClick={handlePrintDepartmentPdf}
                    disabled={departmentPersonnel.length === 0}
                  >
                    Imprimir listado en PDF
                  </button>
                </div>
                {departmentPersonnel.length > 0 ? (
                  <div className="department-personnel-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Foto</th>
                          <th>Cédula</th>
                          <th>Nombre</th>
                          <th>Cargo</th>
                          <th>Teléfono</th>
                          <th>Email</th>
                          <th>Vacaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departmentPersonnel.map((person) => (
                          <tr key={person.id}>
                            <td>
                              {person.foto ? (
                                <img
                                  src={person.foto}
                                  alt={person.nombre}
                                  className="department-personnel-photo"
                                />
                              ) : (
                                <span className="photo-placeholder">Sin foto</span>
                              )}
                            </td>
                            <td>{person.cedula}</td>
                            <td>{person.nombre}</td>
                            <td>{person.cargo}</td>
                            <td>{person.telefono}</td>
                            <td>{person.email}</td>
                            <td>{person.vacacionesPorDisfrutar || 'N/D'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No hay personal registrado en este departamento.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="department-grid">
              {departments.sort((a, b) => a.id - b.id).map((department) => ( // Ordenar por ID
                <div
                  key={department.id}
                  className="department-card"
                  onClick={() => handleDepartmentClick(department)}
                  style={{ '--dept-color': department.color }}
                >
                  <div className="department-icon">{department.icon}</div>
                  <h3 className="department-title">{department.name}</h3>
                  <p className="department-description">{department.description}</p>
                  <div className="department-arrow">→</div>
                </div>
              ))}
            </div>
          )}

          <div className="dashboard-info">
            <div className="info-card">
              <h3>Información del Sistema</h3>
              <p>Este sistema interno permite el acceso a las diferentes áreas departamentales de la organización CLEBG.</p>
              <ul>
                <li>Acceso seguro con autenticación</li>
                <li>Interfaz intuitiva y responsiva</li>
                <li>Gestión centralizada de departamentos</li>
                <li>Navegación fluida entre secciones</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
