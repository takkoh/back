const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'app_user',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME     || 'taller_carpinteriabd',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

// Verificar conexión al iniciar
pool.getConnection()
  .then(conn => {
    console.log('Conectado a MySQL correctamente');
    conn.release();
  })
  .catch(err => {
    console.error('Error al conectar con MySQL:', err.message);
  });

module.exports = pool;
