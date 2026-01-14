import React, { useState } from 'react';
import './DepartmentManagement.css';

const API_URL = 'http://localhost:3002'; // URL de tu backend

const DepartmentManagement = ({ departments, fetchDepartments }) => {
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    icon: '',
    description: '',
    color: '#000000'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddOrUpdateDepartment = async (e) => {
    e.preventDefault();
    setError('');

    try {
      let response;
      if (isEditing) {
        response = await fetch(`${API_URL}/departments/${formData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        response = await fetch(`${API_URL}/departments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }

      const data = await response.json();
      if (data.message === 'success') {
        await fetchDepartments(); // Recargar la lista de departamentos
        resetForm();
      } else {
        console.error('Error al guardar departamento:', data.error);
        setError(data.error || 'Error al guardar departamento.');
      }
    } catch (error) {
      console.error('Error de red al guardar departamento:', error);
      setError('Error de red al guardar departamento.');
    }
  };

  const handleEditDepartment = (department) => {
    setFormData(department);
    setIsEditing(true);
  };

  const handleDeleteDepartment = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este departamento?')) {
      try {
        const response = await fetch(`${API_URL}/departments/${id}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (data.message === 'success') {
          await fetchDepartments(); // Recargar la lista de departamentos
        } else {
          console.error('Error al eliminar departamento:', data.error);
          alert('Error al eliminar departamento: ' + (data.error || 'Desconocido'));
        }
      } catch (error) {
        console.error('Error de red al eliminar departamento:', error);
        alert('Error de red al eliminar departamento.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      name: '',
      icon: '',
      description: '',
      color: '#000000'
    });
    setIsEditing(false);
  };

  return (
    <div className="department-management">
      <h2>Gestionar Departamentos</h2>

      <form onSubmit={handleAddOrUpdateDepartment} className="department-form">
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Nombre del Departamento"
          required
        />
        <input
          type="text"
          name="icon"
          value={formData.icon}
          onChange={handleInputChange}
          placeholder="Icono (ej: 👤)"
          required
        />
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Descripción"
          required
        ></textarea>
        <input
          type="color"
          name="color"
          value={formData.color}
          onChange={handleInputChange}
          title="Color del Departamento"
        />
        {error && <div className="error-message">{error}</div>}
        <button type="submit">{isEditing ? 'Actualizar Departamento' : 'Agregar Departamento'}</button>
        {isEditing && <button type="button" onClick={() => setIsEditing(false)}>Cancelar</button>}
      </form>

      <h3>Lista de Departamentos</h3>
      <div className="department-list-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Icono</th>
              <th>Descripción</th>
              <th>Color</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {departments.sort((a, b) => a.id - b.id).map(department => ( // Ordenar por ID
              <tr key={department.id}>
                <td>{department.id}</td>
                <td>{department.name}</td>
                <td>{department.icon}</td>
                <td>{department.description}</td>
                <td style={{ backgroundColor: department.color, width: '30px' }}></td>
                <td>
                  <button onClick={() => handleEditDepartment(department)}>Editar</button>
                  <button onClick={() => handleDeleteDepartment(department.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DepartmentManagement;
