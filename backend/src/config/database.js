const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

console.log('DB_HOST existe:', !!process.env.DB_HOST);
console.log('DB_PORT existe:', !!process.env.DB_PORT);
console.log('DB_NAME existe:', !!process.env.DB_NAME);
console.log('DB_USER existe:', !!process.env.DB_USER);
console.log('DB_PASSWORD existe:', !!process.env.DB_PASSWORD);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.connect()
  .then(() => {
    console.log('✅ Conectado a PostgreSQL (Railway)');
  })
  .catch((err) => {
    console.error('❌ Error conectando a PostgreSQL completo:');
    console.error(err);
  });

module.exports = pool;