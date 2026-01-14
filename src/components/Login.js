import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Nuevo estado para la visibilidad de la contraseña
  const [showChangePasswordPanel, setShowChangePasswordPanel] = useState(false); // Estado para mostrar/ocultar el panel de cambio de contraseña
  const [changePasswordForm, setChangePasswordForm] = useState({
    changeUsername: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (['username', 'password'].includes(name)) {
      setCredentials(prev => ({
        ...prev,
        [name]: value
      }));
      if (error) setError('');
    } else if (['changeUsername', 'currentPassword', 'newPassword', 'confirmNewPassword'].includes(name)) {
      setChangePasswordForm(prev => ({
        ...prev,
        [name]: value
      }));
      if (changePasswordError) setChangePasswordError('');
      if (changePasswordSuccess) setChangePasswordSuccess('');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setChangePasswordError('');
    setChangePasswordSuccess('');

    const { changeUsername, currentPassword, newPassword, confirmNewPassword } = changePasswordForm;

    if (!changeUsername.trim()) {
      setChangePasswordError('Debe ingresar el usuario asociado a la cuenta.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError('Las nuevas contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) { // Ejemplo de validación mínima
      setChangePasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      // Aquí se asume que el usuario ya está logueado o que el cambio de contraseña se hace para el usuario logueado.
      // Para un administrador cambiando su propia contraseña, se podría usar el token de autenticación.
      // Para un administrador cambiando la contraseña de otro usuario, se necesitaría un endpoint diferente
      // y una forma de identificar al usuario a cambiar.
      // Por ahora, asumimos que es el administrador cambiando su propia contraseña.
      const response = await fetch('http://localhost:3002/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: changeUsername.trim(), currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setChangePasswordSuccess(data.message || 'Contraseña cambiada exitosamente.');
        setChangePasswordForm({
          changeUsername: changeUsername,
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        });
      } else {
        // Si el servidor devuelve un error, podría ser debido a un token inválido/expirado
        // u otros errores de validación del lado del servidor.
        setChangePasswordError(data.message || 'Error al cambiar la contraseña. Verifique su contraseña actual.');
        // Si el mensaje de error del servidor es específicamente sobre la expiración/invalidez del token,
        // podríamos querer limpiar el token de localStorage y redirigir al login.
        if (data.message && (data.message.includes('Token inválido') || data.message.includes('Token expirado'))) {
            localStorage.removeItem('token');
            // Opcionalmente, redirigir al login
            // navigate('/login'); // Esto requeriría que 'navigate' esté disponible aquí
        }
      }
    } catch (err) {
      setChangePasswordError('Error de conexión con el servidor. Asegúrese de que el backend esté funcionando.');
      console.error('Error al cambiar contraseña:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3002/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Login successful, token received:', data.token); // Log para verificar el token recibido
        localStorage.setItem('token', data.token); // Asegurarse de que el token se almacena en localStorage
        localStorage.setItem('userRole', data.role); // Almacenar el rol también
        onLogin(data.token, data.role); // Pasar el token y el rol al onLogin
      } else {
        setError(data.message || 'Error al iniciar sesión. Inténtelo de nuevo.');
      }
    } catch (err) {
      setError('Error de conexión con el servidor. Asegúrese de que el backend esté funcionando.');
      console.error('Error de login:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChangePasswordPanel = () => {
    setShowChangePasswordPanel(prev => {
      const nextValue = !prev;
      if (!prev && !changePasswordForm.changeUsername && credentials.username) {
        setChangePasswordForm(form => ({
          ...form,
          changeUsername: credentials.username
        }));
      }
      return nextValue;
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src="/logo.jpg" alt="Logo CLEBG" className="login-logo" /> {/* Nuevo logo */}
          <h1>SIGHFY CLEBG</h1>
          <p>Iniciar Sesión de Administrador</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Usuario:</label>
            <input
              type="text"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              placeholder="Ingrese su usuario"
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Contraseña:</label>
            <div className="password-input-container"> {/* Contenedor para el input y el botón */}
              <input
                type={showPassword ? 'text' : 'password'} // Cambia el tipo de input
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                placeholder="Ingrese su contraseña"
                required
                disabled={loading}
              />
              <button
                type="button"
                className="toggle-password-visibility"
                onClick={() => setShowPassword(prev => !prev)} // Alterna la visibilidad
                disabled={loading}
              >
                {showPassword ? '👁️' : '🔒'} {/* Icono de ojo o candado */}
              </button>
            </div>
          </div>
          
          {error && <div className="error">{error}</div>}
          
          <button 
            type="submit" 
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <button 
          type="button" 
          className="btn btn-link change-password-toggle"
          onClick={handleToggleChangePasswordPanel}
          disabled={loading}
          >
          {showChangePasswordPanel ? 'Ocultar Panel de Cambio de Contraseña' : 'Cambiar Contraseña'}
        </button>

        {showChangePasswordPanel && (
          <div className="change-password-panel">
            <h2>Cambiar Contraseña</h2>
            <form onSubmit={handleChangePassword} className="change-password-form">
              <div className="form-group">
                <label htmlFor="changeUsername">Usuario:</label>
                <input
                  type="text"
                  id="changeUsername"
                  name="changeUsername"
                  value={changePasswordForm.changeUsername}
                  onChange={handleChange}
                  placeholder="Ingrese su usuario"
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="currentPassword">Contraseña Actual:</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={changePasswordForm.currentPassword}
                  onChange={handleChange}
                  placeholder="Ingrese su contraseña actual"
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">Nueva Contraseña:</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={changePasswordForm.newPassword}
                  onChange={handleChange}
                  placeholder="Ingrese la nueva contraseña"
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmNewPassword">Confirmar Nueva Contraseña:</label>
                <input
                  type="password"
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  value={changePasswordForm.confirmNewPassword}
                  onChange={handleChange}
                  placeholder="Confirme la nueva contraseña"
                  required
                  disabled={loading}
                />
              </div>
              {changePasswordError && <div className="error">{changePasswordError}</div>}
              {changePasswordSuccess && <div className="success">{changePasswordSuccess}</div>}
              <button 
                type="submit" 
                className="btn btn-secondary"
                disabled={loading}
              >
                Cambiar Contraseña
              </button>
            </form>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default Login;
