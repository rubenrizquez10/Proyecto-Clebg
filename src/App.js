
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel'; // Importar AdminPanel
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null); // Nuevo estado para el rol del usuario
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay una sesión activa al cargar la aplicación
    const token = localStorage.getItem('token'); // Cambiado de 'adminToken' a 'token'
    const role = localStorage.getItem('userRole'); // Obtener el rol del localStorage
    if (token && role) {
      setIsAuthenticated(true);
      setUserRole(role);
    }
    setLoading(false);
  }, []);

  const handleLogin = (token, role) => { // Recibir el rol como parámetro
    localStorage.setItem('token', token); // Cambiado de 'adminToken' a 'token'
    localStorage.setItem('userRole', role); // Guardar el rol en localStorage
    setIsAuthenticated(true);
    setUserRole(role); // Actualizar el estado del rol
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); // Cambiado de 'adminToken' a 'token'
    localStorage.removeItem('userRole'); // Eliminar el rol de localStorage
    setIsAuthenticated(false);
    setUserRole(null); // Limpiar el estado del rol
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/login" 
            element={
              isAuthenticated ? 
                <Navigate to="/dashboard" replace /> : 
                <Login onLogin={handleLogin} />
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated ? 
                <Dashboard onLogout={handleLogout} /> : 
                <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/admin" 
            element={
              isAuthenticated ? 
                <AdminPanel userRole={userRole} /> :  // Pasar el rol al AdminPanel
                <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/" 
            element={
              <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
