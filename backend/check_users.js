const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./personnel.db', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error al abrir la base de datos:', err.message);
    return;
  }
  console.log('Conectado a la base de datos SQLite en modo de solo lectura.');

  db.all("SELECT id, username, role, password FROM users", [], (err, rows) => {
    if (err) {
      console.error('Error al consultar la tabla users:', err.message);
      return;
    }
    console.log('Usuarios en la base de datos:');
    rows.forEach(row => {
      console.log(`ID: ${row.id}, Username: ${row.username}, Role: ${row.role}, Password Hash: ${row.password}`);
    });
    db.close((err) => {
      if (err) {
        console.error('Error al cerrar la base de datos:', err.message);
      } else {
        console.log('Base de datos cerrada.');
      }
    });
  });
});
