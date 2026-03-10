const pool = require('../config/database');
const path = require('path');

const getConfiguracion = async (req, res) => {
  try {
    const result = await pool.query('SELECT clave, valor FROM configuracion ORDER BY clave');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateConfiguracion = async (req, res) => {
  try {
    const campos = { ...req.body };

    // Si vienen archivos subidos
    if (req.files) {
      if (req.files.logo) {
        campos.clinica_logo_url = `/uploads/${req.files.logo[0].filename}`;
      }
      if (req.files.firma) {
        campos.firma_medico_url = `/uploads/${req.files.firma[0].filename}`;
      }
    }

    // Guardar cada clave-valor en la tabla configuracion
    for (const [clave, valor] of Object.entries(campos)) {
      if (typeof valor !== 'string' && typeof valor !== 'number') continue;
      await pool.query(`
        INSERT INTO configuracion (clave, valor)
        VALUES ($1, $2)
        ON CONFLICT (clave) DO UPDATE SET valor = $2, updated_at = CURRENT_TIMESTAMP
      `, [clave, valor]);
    }

    res.json({ mensaje: 'Configuración guardada' });
  } catch (error) {
    console.error('Error updateConfiguracion:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getConfiguracion, updateConfiguracion };