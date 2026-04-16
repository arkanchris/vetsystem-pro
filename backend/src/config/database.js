const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // necesario para Railway
  },
});

pool.connect()
  .then(() => console.log('✅ Conectado a PostgreSQL (Railway)'))
  .catch(err => console.error('❌ Error conectando a PostgreSQL:', err.message));

module.exports = pool;