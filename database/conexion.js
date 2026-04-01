const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const conexionPromise = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'verdaderos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

conexionPromise.getConnection().then(conn => {
  console.log('✅ Conexión a la base de datos establecida');
  conn.release();
}).catch(err => {
  console.error('❌ Error al obtener conexión de la base de datos:', err);
});

module.exports = conexionPromise;
