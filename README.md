# Sistema Interno CLEBG

Sistema interno desarrollado en React para la gestión de departamentos organizacionales.

## Características

- 🔐 **Autenticación segura** con login de administrador
- 🏢 **Interfaz de departamentos** con navegación intuitiva
- 📱 **Diseño responsivo** para todos los dispositivos
- 🎨 **Interfaz moderna** con animaciones y transiciones suaves

## Departamentos Incluidos

- **Junta Directiva** - Órgano de gobierno y toma de decisiones
- **Presidencia** - Dirección ejecutiva y representación legal
- **Vice Presidencia** - Apoyo ejecutivo y suplencia
- **Secretaria** - Gestión documental y comunicación
- **Direcciones** - Áreas operativas especializadas

## Instalación y Uso

### Prerrequisitos
- Node.js (versión 14 o superior)
- npm o yarn

### Instalación
```bash
# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo
npm start
```

### Acceso al Sistema
- **URL**: http://localhost:3000
- **Usuario**: admin
- **Contraseña**: admin123

## Estructura del Proyecto

```
src/
├── components/
│   ├── Login.js          # Componente de autenticación
│   ├── Login.css         # Estilos del login
│   ├── Dashboard.js      # Interfaz principal
│   └── Dashboard.css     # Estilos del dashboard
├── App.js               # Componente principal con routing
├── App.css              # Estilos globales
├── index.js             # Punto de entrada
└── index.css            # Estilos base
```

## Tecnologías Utilizadas

- **React 18** - Biblioteca de interfaz de usuario
- **React Router DOM** - Enrutamiento de la aplicación
- **CSS3** - Estilos y animaciones
- **LocalStorage** - Persistencia de sesión

## Funcionalidades

### Autenticación
- Login con credenciales de administrador
- Persistencia de sesión en el navegador
- Protección de rutas privadas
- Logout seguro

### Dashboard
- Visualización de todos los departamentos
- Interfaz de tarjetas interactivas
- Diseño responsivo
- Navegación intuitiva

## Personalización

El sistema está diseñado para ser fácilmente personalizable:

- **Colores**: Modificar las variables CSS en los archivos de estilos
- **Departamentos**: Editar el array `departments` en `Dashboard.js`
- **Credenciales**: Cambiar las credenciales en `Login.js`
- **Estilos**: Personalizar los archivos CSS según necesidades

## Desarrollo

Para contribuir al proyecto:

1. Clona el repositorio
2. Instala las dependencias: `npm install`
3. Inicia el servidor de desarrollo: `npm start`
4. Realiza tus cambios
5. Prueba la funcionalidad

## Licencia

Este proyecto es de uso interno para CLEBG.
