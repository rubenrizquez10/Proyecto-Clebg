const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs'); // Importar bcryptjs

const db = new sqlite3.Database('./personnel.db', (err) => {
  if (err) {
    console.error('Error al abrir la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite.');

    // Crear tabla de usuarios
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'secretary'
    )`, (err) => {
      if (err) {
        console.error('Error al crear la tabla users:', err.message);
      } else {
        console.log('Tabla users creada o ya existe.');
        // Insertar usuarios iniciales si no existen
        const users = [
          { username: 'admin', password: 'adminpassword', role: 'admin' },
          { username: 'secretary', password: 'secpassword', role: 'secretary' }
        ];

        users.forEach(user => {
          bcrypt.hash(user.password, 10, (err, hash) => {
            if (err) {
              console.error(`Error al hashear la contraseña para ${user.username}:`, err.message);
              return;
            }
            db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
              [user.username, hash, user.role],
              function(err) {
                if (err) {
                  console.error(`Error al insertar usuario ${user.username}:`, err.message);
                } else if (this.changes > 0) {
                  console.log(`Usuario ${user.username} (${user.role}) insertado.`);
                }
              });
          });
        });
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      description TEXT,
      color TEXT
    )`, (err) => {
      if (err) {
        console.error('Error al crear la tabla departments:', err.message);
      } else {
        console.log('Tabla departments creada o ya existe.');
        // Insertar departamentos iniciales si no existen, usando los nombres del frontend
        const initialDepartments = [
          { id: 2, name: 'Presidencia', icon: '👤', description: 'Dirección ejecutiva y representación legal de la institución.', color: '#676252ff' },
          { id: 3, name: 'Vice Presidencia', icon: '👥', description: 'Apoyo a la presidencia y suplencia en funciones ejecutivas.', color: '#3f3b30ff' },
          { id: 4, name: 'Secretaria', icon: '📋', description: 'Gestion documental, actas y comunicacion institucional.', color: '#504a37ff' },
          { id: 5, name: 'Direccion de Auditoria Interna', icon: '🏢', description: 'Supervision y evaluacion de los procesos internos para asegurar la transparencia y eficiencia.', color: '#443f30ff' },
          { id: 6, name: 'Plenaria Legislativa', icon: '🏛️', description: 'Organo principal de debate y decision legislativa.', color: '#2a52be' },
          { id: 15, name: 'Coordinacion de cultura', icon: '🎨', description: 'Coordinación de actividades culturales y artísticas.', color: '#FF6347' },
          { id: 7, name: 'Direccion de Gestion Humana', icon: '👨‍💼', description: 'Gestion de recursos humanos, nomina y bienestar del personal.', color: '#ff5733' },
          { id: 8, name: 'Direccion de Investigacion y desarrollo legislativo', icon: '🔬', description: 'Investigacion y desarrollo de propuestas legislativas.', color: '#4CAF50' },
          { id: 9, name: 'Direccion de consultoria juridica', icon: '⚖️', description: 'Asesoramiento legal y gestion de asuntos juridicos.', color: '#8A2BE2' },
          { id: 10, name: 'Direccion de gestion comunicacional', icon: '📢', description: 'Gestion de la comunicacion interna y externa de la institucion.', color: '#FFD700' },
          { id: 11, name: 'Direccion de Servicios Generales', icon: '🛠️', description: 'Gestion y mantenimiento de los servicios generales de la institucion.', color: '#607D8B' },
          { id: 12, name: 'Direccion de Gestion Administrativa', icon: '💼', description: 'Gestion de los recursos administrativos y financieros de la institucion.', color: '#FF8C00' },
          { id: 13, name: 'Direccion de Planificacion, Presupuesto y Control de Gestion', icon: '📊', description: 'Planificacion estrategica, elaboracion de presupuestos y control de gestion institucional.', color: '#8B0000' },
          { id: 14, name: 'Direccion de Tecnologia Informatica', icon: '💻', description: 'Gestion de la infraestructura tecnologica, sistemas y soporte informatico.', color: '#00008B' }
        ];
        initialDepartments.forEach(dept => {
          db.run(`INSERT OR IGNORE INTO departments (id, name, icon, description, color) VALUES (?, ?, ?, ?, ?)`,
            [dept.id, dept.name, dept.icon, dept.description, dept.color],
            function(err) {
              if (err) {
                console.error(`Error al insertar departamento ${dept.name}:`, err.message);
              } else if (this.changes > 0) {
                console.log(`Departamento ${dept.name} insertado.`);
              }
            });
        });
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS personnel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cedula TEXT NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      cargo TEXT NOT NULL,
      departamento TEXT NOT NULL,
      telefono TEXT,
      email TEXT,
      fechaIngreso TEXT,
      salario TEXT,
      foto TEXT,
      vacacionesPorDisfrutar TEXT DEFAULT '',
      FOREIGN KEY (departamento) REFERENCES departments(name)
    )`, (err) => {
      if (err) {
        console.error('Error al crear la tabla personnel:', err.message);
      } else {
        console.log('Tabla personnel creada o ya existe.');
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombreCompleto TEXT NOT NULL,
      cedula TEXT NOT NULL,
      departamentoDestino TEXT NOT NULL,
      motivo TEXT NOT NULL,
      horaEntrada TEXT NOT NULL,
      horaSalida TEXT NOT NULL,
      fechaRegistro TEXT DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error al crear la tabla visits:', err.message);
      } else {
        console.log('Tabla visits creada o ya existe.');

        db.all(`PRAGMA table_info(visits)`, (infoErr, columns) => {
          if (infoErr) {
            console.error('Error al inspeccionar la tabla visits:', infoErr.message);
            return;
          }
          const hasDepartamento = columns.some(column => column.name === 'departamentoDestino');
          if (!hasDepartamento) {
            db.run(`ALTER TABLE visits ADD COLUMN departamentoDestino TEXT NOT NULL DEFAULT ''`, (alterErr) => {
              if (alterErr) {
                console.error('Error al agregar columna departamentoDestino:', alterErr.message);
              } else {
                console.log('Columna departamentoDestino agregada a visits.');
              }
            });
          }
        });
      }
    });
  }
});

module.exports = db;
