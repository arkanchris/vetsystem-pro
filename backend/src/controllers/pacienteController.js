const pool = require('../config/database');

// Helper robusto
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

const parseFecha = (fecha) => {
  if (!fecha) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
    const [dia, mes, anio] = fecha.split('/');
    return `${anio}-${mes}-${dia}`;
  }
  return fecha;
};

const parsePropietarioId = (val) => {
  if (!val || val === 'null' || val === '' || val === '0' || val === 0) return null;
  return parseInt(val);
};

// ── GET todos los pacientes ───────────────────────────────────────────────────
const getPacientes = async (req, res) => {
  try {
    const clienteId = await getClienteId(req.usuario);
    let result;

    if (clienteId) {
      try {
        result = await pool.query(`
          SELECT p.*,
                 pr.nombre    as propietario_nombre,
                 pr.apellido  as propietario_apellido,
                 pr.telefono  as propietario_telefono
          FROM pacientes p
          LEFT JOIN propietarios pr ON p.propietario_id = pr.id
          WHERE p.activo = true AND p.cliente_id = $1
          ORDER BY p.created_at DESC
        `, [clienteId]);
      } catch (e) {
        result = await pool.query(`
          SELECT p.*,
                 pr.nombre    as propietario_nombre,
                 pr.apellido  as propietario_apellido,
                 pr.telefono  as propietario_telefono
          FROM pacientes p
          LEFT JOIN propietarios pr ON p.propietario_id = pr.id
          WHERE p.activo = true
          ORDER BY p.created_at DESC
        `);
      }
    } else {
      result = await pool.query(`
        SELECT p.*,
               pr.nombre    as propietario_nombre,
               pr.apellido  as propietario_apellido,
               pr.telefono  as propietario_telefono
        FROM pacientes p
        LEFT JOIN propietarios pr ON p.propietario_id = pr.id
        WHERE p.activo = true
        ORDER BY p.created_at DESC
      `);
    }

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET por ID ────────────────────────────────────────────────────────────────
const getPacienteById = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*,
             pr.nombre   as propietario_nombre,
             pr.apellido as propietario_apellido,
             pr.telefono as propietario_telefono,
             pr.email    as propietario_email
      FROM pacientes p
      LEFT JOIN propietarios pr ON p.propietario_id = pr.id
      WHERE p.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET hoja de vida ──────────────────────────────────────────────────────────
const getHojaVida = async (req, res) => {
  try {
    const { id } = req.params;

    const pac = await pool.query(`
      SELECT p.*,
             pr.nombre     as propietario_nombre,
             pr.apellido   as propietario_apellido,
             pr.telefono   as propietario_telefono,
             pr.email      as propietario_email,
             pr.direccion  as propietario_direccion,
             pr.documento  as propietario_documento
      FROM pacientes p
      LEFT JOIN propietarios pr ON p.propietario_id = pr.id
      WHERE p.id = $1
    `, [id]);

    if (pac.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });

    const historias = await pool.query(`
      SELECT h.*, u.nombre as veterinario_nombre
      FROM historia_clinica h
      LEFT JOIN usuarios u ON h.usuario_id = u.id
      WHERE h.paciente_id = $1 ORDER BY h.fecha DESC
    `, [id]);

    for (const h of historias.rows) {
      const d = await pool.query(
        'SELECT * FROM historia_documentos WHERE historia_id=$1 ORDER BY created_at DESC', [h.id]
      );
      h.documentos = d.rows;
    }

    const vacunas = await pool.query(
      'SELECT * FROM vacunas WHERE paciente_id=$1 ORDER BY fecha_aplicacion DESC', [id]
    );
    for (const v of vacunas.rows) {
      const d = await pool.query(
        'SELECT * FROM vacuna_documentos WHERE vacuna_id=$1 ORDER BY created_at DESC', [v.id]
      );
      v.documentos = d.rows;
    }

    const adopcion = await pool.query(`
      SELECT a.*, hp.nombre as hogar_nombre, hp.telefono as hogar_telefono,
             hp.contacto_nombre as hogar_contacto
      FROM adopciones a
      LEFT JOIN hogares_paso hp ON a.hogar_paso_id = hp.id
      WHERE a.paciente_id = $1 ORDER BY a.created_at DESC LIMIT 1
    `, [id]);

    const citas = await pool.query(`
      SELECT c.*, u.nombre as veterinario_nombre
      FROM citas c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.paciente_id = $1 ORDER BY c.fecha_cita DESC LIMIT 10
    `, [id]);

    res.json({
      paciente:  pac.rows[0],
      historias: historias.rows,
      vacunas:   vacunas.rows,
      adopcion:  adopcion.rows[0] || null,
      citas:     citas.rows
    });
  } catch (error) {
    console.error('Error getHojaVida:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── CREAR paciente ────────────────────────────────────────────────────────────
const createPaciente = async (req, res) => {
  try {
    const clienteId = await getClienteId(req.usuario);
    const {
      nombre, especie, raza, sexo,
      fecha_nacimiento, fecha_nac_texto,
      color, peso, propietario_id, tipo_ingreso
    } = req.body;

    if (!nombre || !especie) {
      return res.status(400).json({ error: 'Nombre y especie son requeridos' });
    }

    const foto_url = req.file ? `/uploads/${req.file.filename}` : null;

    let result;
    try {
      result = await pool.query(`
        INSERT INTO pacientes
          (nombre, especie, raza, sexo, fecha_nacimiento, fecha_nac_texto,
           color, peso, foto_url, propietario_id, tipo_ingreso, cliente_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
      `, [
        nombre, especie, raza || null, sexo || null,
        parseFecha(fecha_nacimiento), fecha_nac_texto || null,
        color || null, peso ? parseFloat(peso) : null,
        foto_url, parsePropietarioId(propietario_id),
        tipo_ingreso || 'con_tutor', clienteId
      ]);
    } catch (e) {
      console.warn('Insertando paciente sin cliente_id:', e.message);
      result = await pool.query(`
        INSERT INTO pacientes
          (nombre, especie, raza, sexo, fecha_nacimiento, fecha_nac_texto,
           color, peso, foto_url, propietario_id, tipo_ingreso)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
      `, [
        nombre, especie, raza || null, sexo || null,
        parseFecha(fecha_nacimiento), fecha_nac_texto || null,
        color || null, peso ? parseFloat(peso) : null,
        foto_url, parsePropietarioId(propietario_id),
        tipo_ingreso || 'con_tutor'
      ]);
    }

    if (['callejero', 'comunitario', 'abandonado'].includes(tipo_ingreso)) {
      const existe = await pool.query(
        'SELECT id FROM adopciones WHERE paciente_id=$1', [result.rows[0].id]
      );
      if (existe.rows.length === 0) {
        await pool.query(
          "INSERT INTO adopciones (paciente_id, estado, fecha_ingreso) VALUES ($1,'disponible',CURRENT_DATE)",
          [result.rows[0].id]
        );
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('createPaciente error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── ACTUALIZAR paciente ───────────────────────────────────────────────────────
// BUG CORREGIDO: antes usaba `clienteIdCreate` que no existía en este scope
const updatePaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre, especie, raza, sexo,
      fecha_nacimiento, fecha_nac_texto,
      color, peso, propietario_id, tipo_ingreso
    } = req.body;

    let result;
    if (req.file) {
      result = await pool.query(`
        UPDATE pacientes SET
          nombre=$1, especie=$2, raza=$3, sexo=$4,
          fecha_nacimiento=$5, fecha_nac_texto=$6,
          color=$7, peso=$8, propietario_id=$9,
          tipo_ingreso=$10, foto_url=$11
        WHERE id=$12 RETURNING *
      `, [
        nombre, especie, raza || null, sexo || null,
        parseFecha(fecha_nacimiento), fecha_nac_texto || null,
        color || null, peso ? parseFloat(peso) : null,
        parsePropietarioId(propietario_id),
        tipo_ingreso || 'con_tutor',
        `/uploads/${req.file.filename}`,
        id
      ]);
    } else {
      result = await pool.query(`
        UPDATE pacientes SET
          nombre=$1, especie=$2, raza=$3, sexo=$4,
          fecha_nacimiento=$5, fecha_nac_texto=$6,
          color=$7, peso=$8, propietario_id=$9,
          tipo_ingreso=$10
        WHERE id=$11 RETURNING *
      `, [
        nombre, especie, raza || null, sexo || null,
        parseFecha(fecha_nacimiento), fecha_nac_texto || null,
        color || null, peso ? parseFloat(peso) : null,
        parsePropietarioId(propietario_id),
        tipo_ingreso || 'con_tutor',
        id
      ]);
    }

    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });

    if (['callejero', 'comunitario', 'abandonado'].includes(tipo_ingreso)) {
      const existe = await pool.query('SELECT id FROM adopciones WHERE paciente_id=$1', [id]);
      if (existe.rows.length === 0) {
        await pool.query(
          "INSERT INTO adopciones (paciente_id, estado, fecha_ingreso) VALUES ($1,'disponible',CURRENT_DATE)",
          [id]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('updatePaciente error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── ELIMINAR paciente (soft delete) ──────────────────────────────────────────
const deletePaciente = async (req, res) => {
  try {
    await pool.query('UPDATE pacientes SET activo=false WHERE id=$1', [req.params.id]);
    res.json({ mensaje: 'Paciente eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── BUSCAR pacientes ──────────────────────────────────────────────────────────
const searchPacientes = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const clienteId = await getClienteId(req.usuario);
    const like = `%${q}%`;

    let result;
    if (clienteId) {
      try {
        result = await pool.query(`
          SELECT p.*, pr.nombre as propietario_nombre, pr.apellido as propietario_apellido
          FROM pacientes p
          LEFT JOIN propietarios pr ON p.propietario_id = pr.id
          WHERE p.activo = true AND p.cliente_id = $1
            AND (p.nombre ILIKE $2 OR p.especie ILIKE $2 OR p.raza ILIKE $2)
          ORDER BY p.nombre LIMIT 20
        `, [clienteId, like]);
      } catch (e) {
        result = await pool.query(`
          SELECT p.*, pr.nombre as propietario_nombre, pr.apellido as propietario_apellido
          FROM pacientes p
          LEFT JOIN propietarios pr ON p.propietario_id = pr.id
          WHERE p.activo = true
            AND (p.nombre ILIKE $1 OR p.especie ILIKE $1 OR p.raza ILIKE $1)
          ORDER BY p.nombre LIMIT 20
        `, [like]);
      }
    } else {
      result = await pool.query(`
        SELECT p.*, pr.nombre as propietario_nombre, pr.apellido as propietario_apellido
        FROM pacientes p
        LEFT JOIN propietarios pr ON p.propietario_id = pr.id
        WHERE p.activo = true
          AND (p.nombre ILIKE $1 OR p.especie ILIKE $1 OR p.raza ILIKE $1)
        ORDER BY p.nombre LIMIT 20
      `, [like]);
    }

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPacientes, getPacienteById, getHojaVida,
  createPaciente, updatePaciente, deletePaciente,
  searchPacientes
};