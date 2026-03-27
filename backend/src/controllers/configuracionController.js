const pool = require('../config/database');

// Helper: obtener cliente_id real del usuario
const getClienteId = async (usuario) => {
  // 1. Si ya viene en el token
  if (usuario.cliente_id) return usuario.cliente_id;
  // 2. Buscar en BD por el usuario
  const r = await pool.query(
    'SELECT cliente_id, admin_id FROM usuarios WHERE id=$1', [usuario.id]
  );
  if (r.rows[0]?.cliente_id) return r.rows[0].cliente_id;
  // 3. Si es auxiliar, buscar a través de su admin
  if (r.rows[0]?.admin_id) {
    const admin = await pool.query(
      'SELECT cliente_id FROM usuarios WHERE id=$1', [r.rows[0].admin_id]
    );
    return admin.rows[0]?.cliente_id || null;
  }
  return null;
};

// ── GET configuración ─────────────────────────────────────────────────────────
const getConfiguracion = async (req, res) => {
  try {
    const clienteId = await getClienteId(req.usuario);

    if (!clienteId) {
      console.warn('getConfiguracion: usuario sin cliente_id', req.usuario.id);
      return res.json([]);
    }

    // Intentar obtener config del cliente
    let rows = [];
    try {
      const result = await pool.query(
        'SELECT clave, valor FROM configuracion WHERE cliente_id=$1 ORDER BY clave',
        [clienteId]
      );
      rows = result.rows;
    } catch(e) {
      // Si falla (ej: columna cliente_id no existe aún), intentar sin filtro
      console.error('Error buscando config con cliente_id:', e.message);
      const result = await pool.query('SELECT clave, valor FROM configuracion ORDER BY clave');
      rows = result.rows;
    }

    // Si no hay config para este cliente, crear desde datos del cliente maestro
    if (rows.length === 0) {
      const cliente = await pool.query(
        `SELECT nombre, email, telefono, direccion, logo_url, nit FROM clientes WHERE id=$1`,
        [clienteId]
      );
      
      if (cliente.rows.length > 0) {
        const c = cliente.rows[0];
        const defaults = [
          ['clinica_nombre',    c.nombre    || ''],
          ['clinica_email',     c.email     || ''],
          ['clinica_telefono',  c.telefono  || ''],
          ['clinica_direccion', c.direccion || ''],
          ['clinica_nit',       c.nit       || ''],
        ];
        if (c.logo_url) defaults.push(['clinica_logo_url', c.logo_url]);

        for (const [clave, valor] of defaults) {
          if (valor) {
            try {
              await pool.query(
                `INSERT INTO configuracion (clave, valor, cliente_id)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (clave, cliente_id) DO NOTHING`,
                [clave, valor, clienteId]
              );
            } catch(e) {
              // Si el constraint no existe, intentar sin ON CONFLICT
              try {
                await pool.query(
                  `INSERT INTO configuracion (clave, valor, cliente_id)
                   VALUES ($1, $2, $3)`,
                  [clave, valor, clienteId]
                );
              } catch(e2) {
                console.warn('No se pudo insertar config:', clave, e2.message);
              }
            }
          }
        }

        // Retornar la config recién creada
        const fresh = await pool.query(
          'SELECT clave, valor FROM configuracion WHERE cliente_id=$1 ORDER BY clave',
          [clienteId]
        );
        return res.json(fresh.rows);
      }
    }

    return res.json(rows);
  } catch (error) {
    console.error('getConfiguracion error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── UPDATE configuración ──────────────────────────────────────────────────────
const updateConfiguracion = async (req, res) => {
  try {
    const clienteId = await getClienteId(req.usuario);

    if (!clienteId) {
      return res.status(400).json({ error: 'Usuario sin clínica asignada. Contacta al administrador.' });
    }

    const campos = { ...req.body };

    // Procesar archivos subidos
    if (req.files) {
      if (req.files.logo)  campos.clinica_logo_url = `/uploads/${req.files.logo[0].filename}`;
      if (req.files.firma) campos.firma_medico_url  = `/uploads/${req.files.firma[0].filename}`;
    }

    // Guardar cada campo con cliente_id
    for (const [clave, valor] of Object.entries(campos)) {
      if (typeof valor !== 'string' && typeof valor !== 'number') continue;
      try {
        await pool.query(
          `INSERT INTO configuracion (clave, valor, cliente_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (clave, cliente_id)
           DO UPDATE SET valor=$2, updated_at=CURRENT_TIMESTAMP`,
          [clave, String(valor), clienteId]
        );
      } catch(e) {
        // Fallback: UPDATE o INSERT sin constraint
        const existe = await pool.query(
          'SELECT id FROM configuracion WHERE clave=$1 AND cliente_id=$2',
          [clave, clienteId]
        );
        if (existe.rows.length > 0) {
          await pool.query(
            'UPDATE configuracion SET valor=$1, updated_at=CURRENT_TIMESTAMP WHERE clave=$2 AND cliente_id=$3',
            [String(valor), clave, clienteId]
          );
        } else {
          await pool.query(
            'INSERT INTO configuracion (clave, valor, cliente_id) VALUES ($1,$2,$3)',
            [clave, String(valor), clienteId]
          );
        }
      }
    }

    // Sincronizar datos básicos también en tabla clientes
    const camposSync = {
      clinica_nombre:    'nombre',
      clinica_email:     'email',
      clinica_telefono:  'telefono',
      clinica_direccion: 'direccion',
      clinica_nit:       'nit',
    };
    const setCols = [];
    const vals    = [clienteId];
    let   idx     = 2;
    for (const [confKey, dbCol] of Object.entries(camposSync)) {
      if (campos[confKey] !== undefined) {
        setCols.push(`${dbCol}=$${idx++}`);
        vals.push(campos[confKey]);
      }
    }
    if (setCols.length > 0) {
      await pool.query(
        `UPDATE clientes SET ${setCols.join(',')} WHERE id=$1`,
        vals
      );
    }

    res.json({ mensaje: 'Configuración guardada' });
  } catch (error) {
    console.error('updateConfiguracion error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getConfiguracion, updateConfiguracion };