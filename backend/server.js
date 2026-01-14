const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // Importar jsonwebtoken
const bcrypt = require('bcryptjs'); // Importar bcryptjs
const db = require('./init_db'); // Importar la conexión a la base de datos

const app = express();
const PORT = 3002; // Puerto para el backend API
const JWT_SECRET = 'supersecretkey'; // Clave secreta para JWT, ¡cambiar en producción!

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentar el límite del tamaño del cuerpo de la solicitud
app.use(express.urlencoded({ limit: '50mb', extended: true })); // También para datos codificados en URL

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ message: 'No autorizado: Token no proporcionado.' }); // No hay token

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Acceso denegado: Token inválido o expirado.' }); // Token inválido o expirado
    req.user = user;
    next();
  });
};

// Middleware de autorización para administradores
const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: se requiere rol de administrador.' });
  }
  next();
};

// Limpiar visitas anteriores al día actual
const clearOldVisits = () => {
  db.run(
    `DELETE FROM visits WHERE DATE(fechaRegistro) < DATE('now','localtime')`,
    function (err) {
      if (err) {
        console.error('Error al limpiar visitas antiguas:', err.message);
      } else if (this.changes > 0) {
        console.log(`Visitas eliminadas por limpieza diaria: ${this.changes}`);
      }
    }
  );
};

clearOldVisits();
setInterval(clearOldVisits, 60 * 60 * 1000); // Ejecutar cada hora

// Ruta de Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(400).json({ message: 'Usuario o contraseña incorrectos.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Usuario o contraseña incorrectos.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login exitoso', token, role: user.role });
  });
});

// Ruta para obtener información del usuario autenticado (protegida)
app.get('/me', authenticateToken, (req, res) => {
  res.json({ username: req.user.username, role: req.user.role });
});

// Ruta para cambiar la contraseña
app.post('/change-password', async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;

  // Intentar identificar al usuario desde el token si viene incluido (compatibilidad hacia atrás)
  let userIdFromToken = null;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userIdFromToken = decoded.id;
      } catch (err) {
        console.warn('Token inválido durante cambio de contraseña sin sesión:', err.message);
      }
    }
  }

  if (!userIdFromToken && (!username || !currentPassword || !newPassword)) {
    return res.status(400).json({ message: 'Usuario, contraseña actual y nueva contraseña son requeridos.' });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Se requieren la contraseña actual y la nueva contraseña.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }

  const identifierField = userIdFromToken ? 'id' : 'username';
  const identifierValue = userIdFromToken ? userIdFromToken : username;

  db.get(`SELECT id, password FROM users WHERE ${identifierField} = ?`, [identifierValue], async (err, user) => {
    if (err) {
      console.error('Error al buscar usuario para cambio de contraseña:', err.message);
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Contraseña actual incorrecta.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    db.run(`UPDATE users SET password = ? WHERE id = ?`, [hashedNewPassword, user.id], function (err) {
      if (err) {
        console.error('Error al actualizar la contraseña:', err.message);
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(400).json({ message: 'No se pudo actualizar la contraseña. El usuario no existe o no se realizaron cambios.' });
      }
      res.json({ message: 'Contraseña actualizada exitosamente.' });
    });
  });
});

// Rutas para Personal
// Proteger rutas de modificación de personal
app.post('/personnel', authenticateToken, authorizeAdmin, (req, res) => {
  const { cedula, nombre, cargo, departamento, telefono, email, fechaIngreso, salario, foto, vacacionesPorDisfrutar } = req.body;
  console.log('Datos recibidos para agregar personal:', req.body); // Log de los datos recibidos

  if (!cedula || !nombre || !cargo || !departamento) {
    console.error('Error: Campos requeridos faltantes para agregar personal.');
    return res.status(400).json({ "error": "Cédula, nombre, cargo y departamento son campos requeridos." });
  }

  // Verificar si el departamento existe
  db.get(`SELECT id FROM departments WHERE LOWER(name) = LOWER(?)`, [departamento], (err, row) => {
    if (err) {
      console.error('Error al verificar departamento:', err.message);
      res.status(500).json({ "error": err.message });
      return;
    }
    if (!row) {
      console.error(`Error: El departamento '${departamento}' no existe.`);
      res.status(400).json({ "error": `El departamento '${departamento}' no existe.` });
      return;
    }

    db.run(`INSERT INTO personnel (cedula, nombre, cargo, departamento, telefono, email, fechaIngreso, salario, foto, vacacionesPorDisfrutar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cedula, nombre, cargo, departamento, telefono, email, fechaIngreso, salario, foto, vacacionesPorDisfrutar || ''], // Asegurar que se guarda como TEXT
      function (err) {
        if (err) {
          console.error('Error al insertar personal en la base de datos:', err.message);
          let errorMessage = 'Error al insertar personal.';
          if (err.message.includes('UNIQUE constraint failed: personnel.cedula')) {
            errorMessage = 'Ya existe un miembro del personal con esa cédula.';
          } else if (err.message.includes('NOT NULL constraint failed')) {
            errorMessage = 'Faltan campos requeridos.';
          }
          res.status(400).json({ "error": errorMessage });
          return;
        }
        console.log('Personal agregado exitosamente con ID:', this.lastID);
        res.status(201).json({
          "message": "success",
          "data": { id: this.lastID, ...req.body }
        });
      });
  });
});

app.put('/personnel/:id', authenticateToken, authorizeAdmin, (req, res) => {
  const { id } = req.params;
  const { cedula, nombre, cargo, departamento, telefono, email, fechaIngreso, salario, foto, vacacionesPorDisfrutar } = req.body;
  if (!cedula || !nombre || !cargo || !departamento) {
    return res.status(400).json({ "error": "Cédula, nombre, cargo y departamento son campos requeridos." });
  }

  // Verificar si el departamento existe antes de actualizar
  db.get(`SELECT id FROM departments WHERE LOWER(name) = LOWER(?)`, [departamento], (err, row) => {
    if (err) {
      res.status(500).json({ "error": err.message });
      return;
    }
    if (!row) {
      res.status(400).json({ "error": `El departamento '${departamento}' no existe.` });
      return;
    }

    db.run(`UPDATE personnel SET
      cedula = ?,
      nombre = ?,
      cargo = ?,
      departamento = ?,
      telefono = ?,
      email = ?,
      fechaIngreso = ?,
      salario = ?,
      foto = ?,
      vacacionesPorDisfrutar = ?
      WHERE id = ?`,
      [cedula, nombre, cargo, departamento, telefono, email, fechaIngreso, salario, foto, vacacionesPorDisfrutar || '', id], // Asegurar que se guarda como TEXT
      function (err) {
        if (err) {
          res.status(400).json({ "error": err.message });
          return;
        }
        res.json({
          "message": "success",
          "data": { changes: this.changes }
        });
      });
  });
});

app.delete('/personnel/:id', authenticateToken, authorizeAdmin, (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM personnel WHERE id = ?`, id, function (err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": { changes: this.changes }
    });
  });
});

// Rutas para Departamentos
// Proteger rutas de modificación de departamentos
app.post('/departments', authenticateToken, authorizeAdmin, (req, res) => {
  const { name, icon, description, color } = req.body;
  if (!name) {
    return res.status(400).json({ "error": "El nombre del departamento es requerido." });
  }
  db.run(`INSERT INTO departments (name, icon, description, color) VALUES (?, ?, ?, ?)`, [name, icon, description, color], function (err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.status(201).json({
      "message": "success",
      "data": { id: this.lastID, name, icon, description, color }
    });
  });
});

app.put('/departments/:id', authenticateToken, authorizeAdmin, (req, res) => {
  const { id } = req.params;
  const { name, icon, description, color } = req.body;
  if (!name) {
    return res.status(400).json({ "error": "El nombre del departamento es requerido." });
  }
  db.run(`UPDATE departments SET
    name = ?,
    icon = ?,
    description = ?,
    color = ?
    WHERE id = ?`,
    [name, icon, description, color, id],
    function (err) {
      if (err) {
        res.status(400).json({ "error": err.message });
        return;
      }
      res.json({
        "message": "success",
        "data": { changes: this.changes }
      });
    });
});

app.delete('/departments/:id', authenticateToken, authorizeAdmin, (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM departments WHERE id = ?`, id, function (err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": { changes: this.changes }
    });
  });
});


app.get('/personnel', (req, res) => {
  db.all("SELECT * FROM personnel", [], (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});

app.get('/personnel/:cedula', (req, res) => {
  const cedula = req.params.cedula;
  db.get("SELECT * FROM personnel WHERE cedula = ?", [cedula], (err, row) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    if (row) {
      res.json({
        "message": "success",
        "data": row
      });
    } else {
      res.status(404).json({ "message": "Personal no encontrado" });
    }
  });
});

app.get('/departments', (req, res) => {
  db.all("SELECT * FROM departments", [], (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});

// Rutas para visitas
app.post('/visits', (req, res) => {
  const { nombreCompleto, cedula, departamentoDestino, motivo, horaEntrada, horaSalida } = req.body;
  // Permitir "Por Definir" para horaSalida
  if (!nombreCompleto || !cedula || !departamentoDestino || !motivo || !horaEntrada || (horaSalida === '' && horaSalida !== 'Por Definir')) {
    return res.status(400).json({ message: 'Por favor complete todos los campos requeridos.' });
  }

  db.run(
    `INSERT INTO visits (nombreCompleto, cedula, departamentoDestino, motivo, horaEntrada, horaSalida) VALUES (?, ?, ?, ?, ?, ?)`,
    [nombreCompleto.trim(), cedula.trim(), departamentoDestino.trim(), motivo.trim(), horaEntrada, horaSalida],
    function (err) {
      if (err) {
        console.error('Error al registrar visita:', err.message);
        return res.status(500).json({ message: 'No se pudo registrar la visita.' });
      }
      res.status(201).json({
        message: 'success',
        data: {
          id: this.lastID,
          nombreCompleto,
          cedula,
          departamentoDestino,
          motivo,
          horaEntrada,
          horaSalida
        }
      });
    }
  );
});

app.get('/visits', (req, res) => {
  db.all(
    `SELECT * FROM visits WHERE DATE(fechaRegistro) = DATE('now','localtime') ORDER BY datetime(fechaRegistro) DESC`,
    [],
    (err, rows) => {
    if (err) {
      console.error('Error al obtener visitas:', err.message);
      return res.status(500).json({ message: 'No se pudieron obtener los registros.' });
    }
    res.json({
      message: 'success',
      data: rows
    });
    }
  );
});

app.put('/visits/:id', (req, res) => {
  const { id } = req.params;
  const { nombreCompleto, cedula, departamentoDestino, motivo, horaEntrada, horaSalida } = req.body;
  // Permitir "Por Definir" para horaSalida
  if (!nombreCompleto || !cedula || !departamentoDestino || !motivo || !horaEntrada || (horaSalida === '' && horaSalida !== 'Por Definir')) {
    return res.status(400).json({ message: 'Por favor complete todos los campos requeridos.' });
  }

  db.run(
    `UPDATE visits SET nombreCompleto = ?, cedula = ?, departamentoDestino = ?, motivo = ?, horaEntrada = ?, horaSalida = ? WHERE id = ?`,
    [nombreCompleto.trim(), cedula.trim(), departamentoDestino.trim(), motivo.trim(), horaEntrada, horaSalida, id],
    function (err) {
      if (err) {
        console.error('Error al actualizar visita:', err.message);
        return res.status(500).json({ message: 'No se pudo actualizar la visita.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Registro no encontrado.' });
      }
      res.json({
        message: 'success',
        data: {
          id: parseInt(id),
          nombreCompleto,
          cedula,
          departamentoDestino,
          motivo,
          horaEntrada,
          horaSalida
        }
      });
    }
  );
});

app.delete('/visits/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM visits WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error('Error al eliminar visita:', err.message);
      return res.status(500).json({ message: 'No se pudo eliminar el registro.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Registro no encontrado.' });
    }
    res.json({ message: 'success' });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor backend ejecutándose en http://localhost:${PORT}`);
});
