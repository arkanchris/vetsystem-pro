const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'vetsystem_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin123',
});

pool.connect()
  .then(() => console.log('✅ Conectado a PostgreSQL exitosamente'))
  .catch(err => console.error('❌ Error conectando a PostgreSQL:', err.message));

module.exports = pool;