const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { generarUsernameUnico } = require('./authController');

// ── CLIENTES ─────────────────────────────────────────────────────────────────

const getClientes = async (req, res) => {
  try {
    const { busqueda } = req.query;
    let whereClause = '';
    let params = [];
    if (busqueda && busqueda.trim()) {
      whereClause = `WHERE (
        c.nombre    ILIKE $1 OR
        c.nit       ILIKE $1 OR
        c.email     ILIKE $1 OR
        c.ciudad    ILIKE $1 OR
        c.representante ILIKE $1
      )`;
      params = [`%${busqueda.trim()}%`];
    }

    const result = await pool.query(`
      SELECT c.id, c.nombre, c.nit, c.telefono, c.email, c.direccion,
             c.logo_url, c.activo, c.created_at, c.representante,
             c.ciudad, c.pais, c.max_admins
      FROM clientes c
      ${whereClause}
      ORDER BY c.created_at DESC
    `, params);

    // Para cada cliente, traer admins con sus módulos
    const clientes = [];
    for (const c of result.rows) {
      const admins = await pool.query(`
        SELECT u.id, u.nombre, u.email, u.username, u.activo
        FROM usuarios u
        WHERE u.cliente_id = $1 AND u.rol = 'admin'
        ORDER BY u.created_at ASC
      `, [c.id]);

      // Módulos del primer admin (para preview)
      const primerAdmin = admins.rows[0];
      let modulos = [];
      if (primerAdmin) {
        const mods = await pool.query(`
          SELECT m.clave, m.nombre, m.icono, m.orden,
                 COALESCE(ma.activo, false) as activo
          FROM modulos m
          LEFT JOIN modulos_admin ma ON ma.modulo_clave=m.clave AND ma.admin_id=$1
          ORDER BY m.orden
        `, [primerAdmin.id]);
        modulos = mods.rows;
      }

      clientes.push({ ...c, admins: admins.rows, modulos });
    }
    res.json(clientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const createCliente = async (req, res) => {
  try {
    const { nombre, nit, telefono, email, direccion, representante, ciudad, pais, max_admins } = req.body;
    const logo_url = req.file ? `/uploads/${req.file.filename}` : null;
    const result = await pool.query(
      `INSERT INTO clientes (nombre, nit, telefono, email, direccion, logo_url, representante, ciudad, pais, max_admins)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [nombre, nit||null, telefono||null, email||null, direccion||null,
       logo_url, representante||null, ciudad||null, pais||'Colombia',
       parseInt(max_admins)||1]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, nit, telefono, email, direccion, activo, representante, ciudad, pais, max_admins } = req.body;
    let query, params;
    if (req.file) {
      const logo_url = `/uploads/${req.file.filename}`;
      query = `UPDATE clientes SET nombre=$1,nit=$2,telefono=$3,email=$4,direccion=$5,activo=$6,
               logo_url=$7,representante=$8,ciudad=$9,pais=$10,max_admins=$11 WHERE id=$12 RETURNING *`;
      params = [nombre,nit||null,telefono||null,email||null,direccion||null,activo!==false,
                logo_url,representante||null,ciudad||null,pais||'Colombia',parseInt(max_admins)||1,id];
    } else {
      query = `UPDATE clientes SET nombre=$1,nit=$2,telefono=$3,email=$4,direccion=$5,activo=$6,
               representante=$7,ciudad=$8,pais=$9,max_admins=$10 WHERE id=$11 RETURNING *`;
      params = [nombre,nit||null,telefono||null,email||null,direccion||null,activo!==false,
                representante||null,ciudad||null,pais||'Colombia',parseInt(max_admins)||1,id];
    }
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteCliente = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { force } = req.query; // ?force=true para eliminación definitiva

    await client.query('BEGIN');
    if (force === 'true') {
      // Desactivar todos los usuarios del cliente
      await client.query(`UPDATE usuarios SET activo=false WHERE cliente_id=$1`, [id]);
      // Desactivar el cliente
      await client.query(`UPDATE clientes SET activo=false WHERE id=$1`, [id]);
    } else {
      await client.query(`UPDATE clientes SET activo=false WHERE id=$1`, [id]);
      await client.query(`UPDATE usuarios SET activo=false WHERE cliente_id=$1`, [id]);
    }
    await client.query('COMMIT');
    res.json({ mensaje: '✅ Cliente desactivado correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// ── ADMINS ────────────────────────────────────────────────────────────────────

const getAdmins = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.nombre, u.email, u.username, u.activo, u.cliente_id, u.created_at,
             c.nombre as cliente_nombre, c.logo_url as cliente_logo, c.max_admins
      FROM usuarios u
      LEFT JOIN clientes c ON u.cliente_id = c.id
      WHERE u.rol = 'admin'
      ORDER BY c.nombre, u.nombre
    `);
    for (const a of result.rows) {
      const mods = await pool.query(`
        SELECT m.clave, m.nombre, m.icono, m.orden,
               COALESCE(ma.activo, false) as activo
        FROM modulos m
        LEFT JOIN modulos_admin ma ON ma.modulo_clave=m.clave AND ma.admin_id=$1
        ORDER BY m.orden
      `, [a.id]);
      a.modulos = mods.rows;
    }
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createAdmin = async (req, res) => {
  const client = await pool.connect();
  try {
    const { nombre, email, username, password, cliente_id, clinica_nombre } = req.body;

    // Verificar límite de admins del cliente
    if (cliente_id) {
      const clienteData = await client.query('SELECT max_admins FROM clientes WHERE id=$1', [cliente_id]);
      const maxAdmins = clienteData.rows[0]?.max_admins || 1;
      const adminsActuales = await client.query(
        `SELECT COUNT(*) FROM usuarios WHERE cliente_id=$1 AND rol='admin' AND activo=true`, [cliente_id]
      );
      if (parseInt(adminsActuales.rows[0].count) >= maxAdmins)
        return res.status(400).json({ error: `❌ Este cliente ya alcanzó el límite de ${maxAdmins} administrador(es).` });
    }

    const existeEmail = await client.query('SELECT id FROM usuarios WHERE email=$1', [email]);
    if (existeEmail.rows.length > 0)
      return res.status(400).json({ error: '❌ El email ya está registrado.' });

    // Username único
    const usernameBase = username || email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    const usernameUnico = await generarUsernameUnico(usernameBase);

    const hash = await bcrypt.hash(password, 10);

    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO usuarios (nombre, email, username, password, rol, activo, cliente_id, clinica_nombre, puede_ver_finanzas)
       VALUES ($1,$2,$3,$4,$7::text,true,$5,$6,true) RETURNING id, nombre, email, username, rol`,
      [nombre, email, usernameUnico, hash, cliente_id||null, clinica_nombre||null, rol||'admin']
    );

    const adminId = result.rows[0].id;
    await client.query(
      `INSERT INTO modulos_admin (admin_id, modulo_clave, activo)
       SELECT $1, clave, CASE WHEN clave IN ('dashboard','configuracion') THEN true ELSE false END
       FROM modulos
       ON CONFLICT (admin_id, modulo_clave) DO NOTHING`,
      [adminId]
    );

    await client.query('COMMIT');
    res.status(201).json({ ...result.rows[0], username: usernameUnico });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE usuarios SET activo=false WHERE id=$1 AND rol='admin'", [id]);
    res.json({ mensaje: '✅ Admin desactivado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteAdminDefinitivo = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query('SELECT id, rol FROM usuarios WHERE id=$1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (check.rows[0].rol === 'master') return res.status(403).json({ error: '❌ No puedes eliminar un máster' });
    // Limpiar relaciones
    await pool.query('DELETE FROM modulos_admin WHERE admin_id=$1', [id]);
    await pool.query('DELETE FROM modulos_auxiliar WHERE auxiliar_id=$1', [id]);
    await pool.query('UPDATE usuarios SET admin_id=NULL WHERE admin_id=$1', [id]);
    await pool.query('DELETE FROM usuarios WHERE id=$1', [id]);
    res.json({ mensaje: '✅ Admin eliminado definitivamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── MÓDULOS ───────────────────────────────────────────────────────────────────

const getModulosAdmin = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.clave, m.nombre, m.descripcion, m.icono, m.orden,
             COALESCE(ma.activo, false) as activo
      FROM modulos m
      LEFT JOIN modulos_admin ma ON ma.modulo_clave=m.clave AND ma.admin_id=$1
      ORDER BY m.orden
    `, [req.params.adminId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const setModulosAdmin = async (req, res) => {
  const client = await pool.connect();
  try {
    const { adminId } = req.params;
    const { modulos } = req.body;
    await client.query('BEGIN');
    await client.query('DELETE FROM modulos_admin WHERE admin_id=$1', [adminId]);
    for (const mod of modulos) {
      await client.query(
        `INSERT INTO modulos_admin (admin_id, modulo_clave, activo)
         VALUES ($1,$2,$3) ON CONFLICT (admin_id, modulo_clave) DO UPDATE SET activo=$3`,
        [adminId, mod.clave, ['dashboard','configuracion'].includes(mod.clave) ? true : mod.activo]
      );
    }
    await client.query('COMMIT');
    const updated = await pool.query(`
      SELECT m.clave, m.nombre, m.icono, COALESCE(ma.activo,false) as activo
      FROM modulos m LEFT JOIN modulos_admin ma ON ma.modulo_clave=m.clave AND ma.admin_id=$1
      ORDER BY m.orden
    `, [adminId]);
    res.json({ mensaje: '✅ Módulos actualizados', modulos: updated.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

const getTodosModulos = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM modulos ORDER BY orden');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── AUXILIARES ────────────────────────────────────────────────────────────────

const getAuxiliaresConModulos = async (req, res) => {
  try {
    const { id: adminId, cliente_id } = req.usuario;
    const modulosAdmin = await pool.query(
      `SELECT modulo_clave FROM modulos_admin WHERE admin_id=$1 AND activo=true`, [adminId]
    );
    const clavesAdmin = modulosAdmin.rows.map(m => m.modulo_clave);
    const auxiliares = await pool.query(
      `SELECT id, nombre, email, username, activo, rol FROM usuarios
       WHERE cliente_id=$1 AND rol IN ('auxiliar','veterinario','admin_veterinario') ORDER BY nombre`,
      [cliente_id]
    );
    for (const aux of auxiliares.rows) {
      const mods = await pool.query(`
        SELECT m.clave, m.nombre, m.icono, m.orden, COALESCE(ma.activo,false) as activo
        FROM modulos m
        LEFT JOIN modulos_auxiliar ma ON ma.modulo_clave=m.clave AND ma.auxiliar_id=$1
        WHERE m.clave = ANY($2::text[]) ORDER BY m.orden
      `, [aux.id, clavesAdmin]);
      aux.modulos = mods.rows;
    }
    res.json({ auxiliares: auxiliares.rows, modulos_disponibles: clavesAdmin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const setModulosAuxiliar = async (req, res) => {
  const client = await pool.connect();
  try {
    const { auxiliarId } = req.params;
    const { cliente_id } = req.usuario;
    const { modulos } = req.body;
    const check = await pool.query('SELECT id FROM usuarios WHERE id=$1 AND cliente_id=$2', [auxiliarId, cliente_id]);
    if (check.rows.length === 0) return res.status(403).json({ error: 'No autorizado' });
    await client.query('BEGIN');
    await client.query('DELETE FROM modulos_auxiliar WHERE auxiliar_id=$1', [auxiliarId]);
    for (const mod of modulos) {
      if (mod.activo) {
        await client.query(
          `INSERT INTO modulos_auxiliar (auxiliar_id, modulo_clave, activo) VALUES ($1,$2,true)
           ON CONFLICT (auxiliar_id, modulo_clave) DO UPDATE SET activo=true`,
          [auxiliarId, mod.clave]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ mensaje: '✅ Permisos actualizados' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

const cambiarPasswordMaster = async (req, res) => {
  try {
    const { password_actual, password_nuevo } = req.body;
    const user = await pool.query('SELECT * FROM usuarios WHERE id=$1', [req.usuario.id]);
    const ok = await bcrypt.compare(password_actual, user.rows[0].password);
    if (!ok) return res.status(400).json({ error: '❌ Contraseña actual incorrecta' });
    const hash = await bcrypt.hash(password_nuevo, 10);
    await pool.query('UPDATE usuarios SET password=$1 WHERE id=$2', [hash, req.usuario.id]);
    res.json({ mensaje: '✅ Contraseña actualizada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getClientes, createCliente, updateCliente, deleteCliente,
  getAdmins, createAdmin, deleteAdmin, deleteAdminDefinitivo,
  getModulosAdmin, setModulosAdmin, getTodosModulos,
  getAuxiliaresConModulos, setModulosAuxiliar,
  cambiarPasswordMaster
};