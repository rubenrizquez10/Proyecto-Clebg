import React, { useState, useEffect, useCallback } from 'react';
import PersonnelManagement from './PersonnelManagement';
import DepartmentManagement from './DepartmentManagement';
import './AdminPanel.css';

const API_URL = 'http://localhost:3002'; // URL de tu backend

const AdminPanel = ({ userRole }) => { // Recibir userRole como prop
  const [activeTab, setActiveTab] = useState('personnel');
  const [personnel, setPersonnel] = useState([]);
  const [departments, setDepartments] = useState([]);

  const fetchPersonnel = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/personnel`);
      const data = await response.json();
      if (data.message === 'success') {
        setPersonnel(data.data);
      } else {
        console.error('Error al cargar personal:', data.error);
      }
    } catch (error) {
      console.error('Error de red al cargar personal:', error);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/departments`);
      const data = await response.json();
      if (data.message === 'success') {
        setDepartments(data.data);
      } else {
        console.error('Error al cargar departamentos:', data.error);
      }
    } catch (error) {
      console.error('Error de red al cargar departamentos:', error);
    }
  }, []);

  useEffect(() => {
    fetchPersonnel();
    fetchDepartments();
  }, [fetchPersonnel, fetchDepartments]);

  const renderContent = () => {
    switch (activeTab) {
      case 'personnel':
        return (
          <PersonnelManagement
            departments={departments}
            personnel={personnel}
            setPersonnel={setPersonnel}
            fetchPersonnel={fetchPersonnel} // Pasar la función para recargar el personal
          />
        );
      case 'departments':
        return (
          <DepartmentManagement
            departments={departments}
            setDepartments={setDepartments}
            fetchDepartments={fetchDepartments} // Pasar la función para recargar los departamentos
          />
        );
      default:
        return (
          <PersonnelManagement
            departments={departments}
            personnel={personnel}
            setPersonnel={setPersonnel}
            fetchPersonnel={fetchPersonnel}
          />
        );
    }
  };

  if (userRole === 'secretary') {
    return (
      <div className="admin-panel no-access">
        <div className="no-access-message">
          <h2>No tiene acceso a este panel</h2>
          <p>Solo los administradores pueden gestionar el personal y los departamentos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Panel de Administración</h1>
        <div className="admin-tabs">
          <button
            className={`tab-button ${activeTab === 'personnel' ? 'active' : ''}`}
            onClick={() => setActiveTab('personnel')}
          >
            Gestionar Personal
          </button>
          <button
            className={`tab-button ${activeTab === 'departments' ? 'active' : ''}`}
            onClick={() => setActiveTab('departments')}
          >
            Gestionar Departamentos
          </button>
        </div>
      </div>

      <div className="admin-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminPanel;
