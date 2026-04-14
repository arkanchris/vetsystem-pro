const pool = require('../config/database');

// Helper robusto: obtiene cliente_id del token o desde la BD
const getClienteId = async (usuario) => {
  try {
    if (usuario.cliente_id) return usuario.cliente_id;
    const r = await pool.query(
      'SELECT cliente_id, admin_id FROM usuarios WHERE id=$1', [usuario.id]
    );
    if (!r.rows[0]) return null;
    if (r.rows[0].cliente_id) return r.rows[0].cliente_id;
    if (r.rows[0].admin_id) {
      const a = await pool.query(
        'SELECT cliente_id FROM usuarios WHERE id=$1', [r.rows[0].admin_id]
      );
      return a.rows[0]?.cliente_id || null;
    }
    return null;
  } catch (e) {
    console.warn('getClienteId error:', e.message);
    return null;
  }
};

// Helper: verificar si una columna existe en la tabla
const columnaExiste = async (tabla, columna) => {
  try {
    const r = await pool.query(
      `SELECT COUNT(*) as cnt FROM information_schema.columns
       WHERE table_name=$1 AND column_name=$2`,
      [tabla, columna]
    );
    return parseInt(r.rows[0].cnt) > 0;
  } catch (e) {
    return false;
  }
};

// ── GET todos los propietarios ────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const clienteId = await getClienteId(req.usuario);
    let rows = [];

    if (clienteId) {
      try {
        const r = await pool.query(
          `SELECT p.*, COUNT(pa.id) as total_mascotas
           FROM propietarios p
           LEFT JOIN pacientes pa ON pa.propietario_id = p.id AND pa.activo = true
           WHERE p.cliente_id = $1
           GROUP BY p.id
           ORDER BY p.apellido, p.nombre`,
          [clienteId]
        );
        rows = r.rows;
      } catch (e) {
        const r = await pool.query(
          `SELECT p.*, COUNT(pa.id) as total_mascotas
           FROM propietarios p
           LEFT JOIN pacientes pa ON pa.propietario_id = p.id AND pa.activo = true
           GROUP BY p.id
           ORDER BY p.apellido, p.nombre`
        );
        rows = r.rows;
      }
    } else {
      const r = await pool.query(
        `SELECT p.*, COUNT(pa.id) as total_mascotas
         FROM propietarios p
         LEFT JOIN pacientes pa ON pa.propietario_id = p.id AND pa.activo = true
         GROUP BY p.id
         ORDER BY p.apellido, p.nombre`
      );
      rows = r.rows;
    }

    res.json(rows);
  } catch (e) {
    console.error('propietarios getAll:', e.message);
    res.status(500).json({ error: e.message });
  }
};

// ── GET por ID ────────────────────────────────────────────────────────────────
const getById = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM propietarios WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'No encontrado' });
    const mascotas = await pool.query(
      'SELECT * FROM pacientes WHERE propietario_id=$1 AND activo=true', [req.params.id]
    );
    res.json({ ...r.rows[0], mascotas: mascotas.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── CREAR propietario ─────────────────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const clienteId = await getClienteId(req.usuario);
    const { nombre, apellido, email, telefono, direccion, documento, tipo_documento, ciudad } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    // Verificar qué columnas existen realmente en la tabla
    const [tieneTipoDoc, tieneCiudad, tieneClienteId] = await Promise.all([
      columnaExiste('propietarios', 'tipo_documento'),
      columnaExiste('propietarios', 'ciudad'),
      columnaExiste('propietarios', 'cliente_id'),
    ]);

    // Construir el INSERT dinámicamente según columnas disponibles
    const campos  = ['nombre', 'apellido', 'email', 'telefono', 'direccion', 'documento'];
    const valores = [
      nombre.trim(),
      apellido?.trim()  || null,
      email?.trim()     || null,
      telefono?.trim()  || null,
      direccion?.trim() || null,
      documento?.trim() || null,
    ];

    if (tieneTipoDoc) {
      campos.push('tipo_documento');
      valores.push(tipo_documento || 'CC');
    }
    if (tieneCiudad) {
      campos.push('ciudad');
      valores.push(ciudad?.trim() || null);
    }
    if (tieneClienteId) {
      campos.push('cliente_id');
      valores.push(clienteId);
    }

    const placeholders = valores.map((_, i) => `$${i + 1}`).join(', ');
    const query = `INSERT INTO propietarios (${campos.join(', ')}) VALUES (${placeholders}) RETURNING *`;

    let r;
    try {
      r = await pool.query(query, valores);
    } catch (e) {
      // Manejar constraint UNIQUE de forma amigable
      if (e.code === '23505') {
        if (e.detail?.includes('email') || e.constraint?.includes('email')) {
          return res.status(409).json({ error: 'Ya existe un propietario con ese correo electrónico.' });
        }
        if (e.detail?.includes('documento') || e.constraint?.includes('documento')) {
          return res.status(409).json({ error: 'Ya existe un propietario con ese número de documento.' });
        }
        return res.status(409).json({ error: 'Ya existe un propietario con esos datos.' });
      }
      throw e;
    }

    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error('propietarios create:', e.message);
    res.status(500).json({ error: 'Error al crear propietario: ' + e.message });
  }
};

// ── ACTUALIZAR propietario ────────────────────────────────────────────────────
const update = async (req, res) => {
  try {
    const { nombre, apellido, email, telefono, direccion, documento, tipo_documento, ciudad } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    // Verificar columnas disponibles
    const [tieneTipoDoc, tieneCiudad] = await Promise.all([
      columnaExiste('propietarios', 'tipo_documento'),
      columnaExiste('propietarios', 'ciudad'),
    ]);

    // Construir el UPDATE dinámicamente
    const sets   = [];
    const valores = [];
    let idx = 1;

    const agregar = (campo, valor) => {
      sets.push(`${campo}=$${idx++}`);
      valores.push(valor);
    };

    agregar('nombre',    nombre.trim());
    agregar('apellido',  apellido?.trim()  || null);
    agregar('email',     email?.trim()     || null);
    agregar('telefono',  telefono?.trim()  || null);
    agregar('direccion', direccion?.trim() || null);
    agregar('documento', documento?.trim() || null);

    if (tieneTipoDoc) agregar('tipo_documento', tipo_documento || 'CC');
    if (tieneCiudad)  agregar('ciudad', ciudad?.trim() || null);

    valores.push(req.params.id); // último parámetro para el WHERE id=$N

    let r;
    try {
      r = await pool.query(
        `UPDATE propietarios SET ${sets.join(', ')} WHERE id=$${idx} RETURNING *`,
        valores
      );
    } catch (e) {
      if (e.code === '23505') {
        return res.status(409).json({ error: 'Ya existe otro propietario con ese email o documento.' });
      }
      throw e;
    }

    if (!r.rows[0]) return res.status(404).json({ error: 'Propietario no encontrado' });
    res.json(r.rows[0]);
  } catch (e) {
    console.error('propietarios update:', e.message);
    res.status(500).json({ error: 'Error al actualizar: ' + e.message });
  }
};

// ── ELIMINAR propietario ──────────────────────────────────────────────────────
const remove = async (req, res) => {
  try {
    // Verificar si tiene mascotas activas
    const pac = await pool.query(
      'SELECT COUNT(*) as total FROM pacientes WHERE propietario_id=$1 AND activo=true',
      [req.params.id]
    );
    if (parseInt(pac.rows[0].total) > 0) {
      return res.status(400).json({
        error: `No se puede eliminar: tiene ${pac.rows[0].total} mascota(s) activa(s) asociada(s).`
      });
    }
    await pool.query('DELETE FROM propietarios WHERE id=$1', [req.params.id]);
    res.json({ mensaje: 'Propietario eliminado correctamente' });
  } catch (e) {
    console.error('propietarios remove:', e.message);
    res.status(500).json({ error: e.message });
  }
};

// ── BUSCAR propietarios ───────────────────────────────────────────────────────
const buscar = async (req, res) => {
  try {
    const clienteId = await getClienteId(req.usuario);
    const q = `%${req.query.q || ''}%`;
    let r;

    if (clienteId) {
      try {
        r = await pool.query(
          `SELECT * FROM propietarios
           WHERE cliente_id=$1
             AND (nombre ILIKE $2 OR apellido ILIKE $2
                  OR email ILIKE $2 OR telefono ILIKE $2 OR documento ILIKE $2)
           ORDER BY apellido, nombre LIMIT 20`,
          [clienteId, q]
        );
      } catch (e) {
        r = await pool.query(
          `SELECT * FROM propietarios
           WHERE nombre ILIKE $1 OR apellido ILIKE $1 OR documento ILIKE $1
           ORDER BY apellido, nombre LIMIT 20`,
          [q]
        );
      }
    } else {
      r = await pool.query(
        `SELECT * FROM propietarios
         WHERE nombre ILIKE $1 OR apellido ILIKE $1 OR documento ILIKE $1
         ORDER BY apellido, nombre LIMIT 20`,
        [q]
      );
    }

    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { getAll, getById, create, update, remove, buscar };