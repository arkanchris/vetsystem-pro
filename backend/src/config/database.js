const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

console.log('DATABASE_URL existe:', !!process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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