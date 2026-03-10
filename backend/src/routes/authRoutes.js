const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware');
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// ── Rutas existentes ────────────────────────────────────────────────────────
router.post('/login', authController.login);
router.post('/registro', authController.registro);
router.get('/perfil', verificarToken, authController.perfil);

// ── Gestión de usuarios (solo admin) ────────────────────────────────────────

// Listar todos los usuarios
router.get('/usuarios', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    const result = await pool.query(
      'SELECT id, nombre, email, rol, activo, puede_ver_finanzas FROM usuarios ORDER BY nombre ASC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar usuario existente
router.put('/usuarios/:id', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    const { id } = req.params;
    const { nombre, email, password, rol, activo, puede_ver_finanzas } = req.body;

    let query, params;
    if (password && password.trim() !== '') {
      const hash = await bcrypt.hash(password, 10);
      query = `
        UPDATE usuarios
        SET nombre=$1, email=$2, password=$3, rol=$4, activo=$5, puede_ver_finanzas=$6
        WHERE id=$7
        RETURNING id, nombre, email, rol, activo, puede_ver_finanzas
      `;
      params = [nombre, email, hash, rol, activo, puede_ver_finanzas ?? false, id];
    } else {
      query = `
        UPDATE usuarios
        SET nombre=$1, email=$2, rol=$3, activo=$4, puede_ver_finanzas=$5
        WHERE id=$6
        RETURNING id, nombre, email, rol, activo, puede_ver_finanzas
      `;
      params = [nombre, email, rol, activo, puede_ver_finanzas ?? false, id];
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;