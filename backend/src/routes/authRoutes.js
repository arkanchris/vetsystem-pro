const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken, soloMaster, soloAdmin } = require('../middlewares/authMiddleware');
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { generarUsernameUnico } = require('../controllers/authController');

router.post('/login',   authController.login);
router.post('/registro', authController.registro);
router.get('/perfil',   verificarToken, authController.perfil);

// Sugerir username basado en nombre + email (para el máster al crear admin)
router.post('/sugerir-username', verificarToken, soloMaster, async (req, res) => {
  try {
    const { nombre, email } = req.body;
    // Generar candidatos: de email, de nombre, combinación
    const desdEmail = email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
    const desdeNombre = nombre?.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '').substring(0, 20) || '';
    const partes = nombre?.trim().split(' ') || [];
    const inicialNombre = partes[0]?.charAt(0)?.toLowerCase() || '';
    const apellido = partes[partes.length > 1 ? partes.length-1 : 0]?.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '') || '';
    const combinado = `${inicialNombre}${apellido}`.substring(0, 20);

    const sugerencias = [];
    for (const base of [desdeNombre, desdEmail, combinado]) {
      if (base.length >= 3) {
        const unico = await generarUsernameUnico(base);
        if (!sugerencias.includes(unico)) sugerencias.push(unico);
      }
    }
    res.json({ sugerencias: sugerencias.slice(0, 3) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verificar si un username está disponible
router.get('/verificar-username/:username', verificarToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id FROM usuarios WHERE username=$1', [req.params.username]);
    res.json({ disponible: result.rows.length === 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Listar usuarios (aislado por cliente_id) ─────────────────────────────────
router.get('/usuarios', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { rol, id, cliente_id } = req.usuario;
    let result;
    if (rol === 'master') {
      result = await pool.query(
        `SELECT id, nombre, email, username, rol, activo, puede_ver_finanzas, cliente_id, admin_id
         FROM usuarios ORDER BY nombre ASC`
      );
    } else {
      result = await pool.query(
        `SELECT id, nombre, email, username, rol, activo, puede_ver_finanzas, cliente_id, admin_id
         FROM usuarios
         WHERE cliente_id = $1 AND rol IN ('auxiliar','veterinario','admin') AND id != $2
         ORDER BY nombre ASC`,
        [cliente_id, id]
      );
    }
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Crear usuario auxiliar (admin crea para su cliente) ───────────────────────
router.post('/usuarios', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { rol: rolSolicitante, id: adminId, cliente_id } = req.usuario;
    if (rolSolicitante !== 'master' && ['admin','master'].includes(req.body.rol))
      return res.status(403).json({ error: '❌ Solo el Máster puede crear usuarios admin.' });

    const { nombre, email, username, password, rol, activo, puede_ver_finanzas } = req.body;

    const existeEmail = await pool.query('SELECT id FROM usuarios WHERE email=$1', [email]);
    if (existeEmail.rows.length > 0)
      return res.status(400).json({ error: '❌ El email ya está registrado.' });

    // Username: usar el provisto o generar uno
    const usernameBase = username || email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    const usernameUnico = await generarUsernameUnico(usernameBase);

    const existeUser = await pool.query('SELECT id FROM usuarios WHERE username=$1', [usernameUnico]);
    if (existeUser.rows.length > 0)
      return res.status(400).json({ error: '❌ Ese nombre de usuario ya existe.' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, username, password, rol, activo, puede_ver_finanzas, admin_id, cliente_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, nombre, email, username, rol, activo, puede_ver_finanzas`,
      [nombre, email, usernameUnico, hash, rol||'auxiliar',
       activo !== false, puede_ver_finanzas || false,
       rolSolicitante === 'master' ? null : adminId, cliente_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Actualizar usuario ────────────────────────────────────────────────────────
router.put('/usuarios/:id', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { rol: rolSolicitante, cliente_id } = req.usuario;
    const { id } = req.params;
    if (rolSolicitante !== 'master') {
      const check = await pool.query('SELECT id FROM usuarios WHERE id=$1 AND cliente_id=$2', [id, cliente_id]);
      if (check.rows.length === 0)
        return res.status(403).json({ error: '❌ No tienes permiso.' });
    }
    const { nombre, email, username, password, rol, activo, puede_ver_finanzas } = req.body;
    if (rolSolicitante !== 'master' && ['admin','master'].includes(rol))
      return res.status(403).json({ error: '❌ No puedes asignar ese rol.' });

    // Verificar username único (si cambió)
    if (username) {
      const dupUser = await pool.query('SELECT id FROM usuarios WHERE username=$1 AND id!=$2', [username, id]);
      if (dupUser.rows.length > 0)
        return res.status(400).json({ error: '❌ Ese nombre de usuario ya está en uso.' });
    }

    let query, params;
    if (password?.trim()) {
      const hash = await bcrypt.hash(password, 10);
      query = `UPDATE usuarios SET nombre=$1,email=$2,username=$3,password=$4,rol=$5,activo=$6,puede_ver_finanzas=$7
               WHERE id=$8 RETURNING id,nombre,email,username,rol,activo,puede_ver_finanzas`;
      params = [nombre, email, username, hash, rol, activo, puede_ver_finanzas??false, id];
    } else {
      query = `UPDATE usuarios SET nombre=$1,email=$2,username=$3,rol=$4,activo=$5,puede_ver_finanzas=$6
               WHERE id=$7 RETURNING id,nombre,email,username,rol,activo,puede_ver_finanzas`;
      params = [nombre, email, username, rol, activo, puede_ver_finanzas??false, id];
    }
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Eliminar usuario ──────────────────────────────────────────────────────────
// ── Desactivar usuario (activo = false) ──────────────────────────────────────
router.delete('/usuarios/:id', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { rol: rolSolicitante, cliente_id, id: propioId } = req.usuario;
    const { id } = req.params;
    if (parseInt(id) === propioId)
      return res.status(400).json({ error: '❌ No puedes desactivarte a ti mismo.' });
    if (rolSolicitante !== 'master') {
      const check = await pool.query('SELECT id FROM usuarios WHERE id=$1 AND cliente_id=$2', [id, cliente_id]);
      if (check.rows.length === 0)
        return res.status(403).json({ error: '❌ Sin permisos.' });
    }
    await pool.query('UPDATE usuarios SET activo=false WHERE id=$1', [id]);
    res.json({ mensaje: '✅ Usuario desactivado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Eliminar usuario definitivamente ─────────────────────────────────────────
// Máster: puede eliminar cualquier usuario (admin o auxiliar)
// Admin: solo puede eliminar sus auxiliares (mismo cliente_id, rol != admin/master)
router.delete('/usuarios/:id/eliminar', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { rol: rolSolicitante, cliente_id, id: propioId } = req.usuario;
    const { id } = req.params;

    if (parseInt(id) === propioId)
      return res.status(400).json({ error: '❌ No puedes eliminarte a ti mismo.' });

    // Obtener info del usuario a eliminar
    const target = await pool.query('SELECT * FROM usuarios WHERE id=$1', [id]);
    if (target.rows.length === 0)
      return res.status(404).json({ error: '❌ Usuario no encontrado.' });

    const userTarget = target.rows[0];

    if (rolSolicitante === 'master') {
      // Máster puede eliminar cualquiera menos otro master
      if (userTarget.rol === 'master')
        return res.status(403).json({ error: '❌ No puedes eliminar otro usuario máster.' });
    } else {
      // Admin solo puede eliminar auxiliares/veterinarios de su propio cliente
      if (!['auxiliar', 'veterinario'].includes(userTarget.rol))
        return res.status(403).json({ error: '❌ Solo puedes eliminar usuarios auxiliares.' });
      if (userTarget.cliente_id !== cliente_id)
        return res.status(403).json({ error: '❌ Sin permisos sobre este usuario.' });
    }

    // Limpiar relaciones antes de eliminar
    await pool.query('DELETE FROM modulos_auxiliar WHERE auxiliar_id=$1', [id]);
    await pool.query('DELETE FROM modulos_admin    WHERE admin_id=$1', [id]);
    await pool.query('DELETE FROM usuarios WHERE id=$1', [id]);

    res.json({ mensaje: '✅ Usuario eliminado definitivamente' });
  } catch (error) {
    console.error('Error eliminar definitivo:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;