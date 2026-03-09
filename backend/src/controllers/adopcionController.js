const pool = require('../config/database');

// ─── HOGARES ────────────────────────────────────────────────────────────────

const getHogares = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM hogares_paso WHERE activo=true ORDER BY nombre ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createHogar = async (req, res) => {
  try {
    const { nombre, direccion, telefono, contacto_nombre, email, capacidad, notas } = req.body;
    const result = await pool.query(
      'INSERT INTO hogares_paso (nombre, direccion, telefono, contacto_nombre, email, capacidad, notas) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [nombre, direccion||null, telefono||null, contacto_nombre||null, email||null, capacidad||0, notas||null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateHogar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, direccion, telefono, contacto_nombre, email, capacidad, notas } = req.body;
    const result = await pool.query(
      'UPDATE hogares_paso SET nombre=$1, direccion=$2, telefono=$3, contacto_nombre=$4, email=$5, capacidad=$6, notas=$7 WHERE id=$8 RETURNING *',
      [nombre, direccion||null, telefono||null, contacto_nombre||null, email||null, capacidad||0, notas||null, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteHogar = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE hogares_paso SET activo=false WHERE id=$1', [id]);
    res.json({ mensaje: 'Hogar eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── ADOPCIONES ─────────────────────────────────────────────────────────────

const getAdopciones = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*,
             p.nombre AS paciente_nombre, p.especie, p.raza, p.sexo,
             p.foto_url, p.tipo_ingreso, p.color,
             h.nombre AS hogar_nombre, h.telefono AS hogar_telefono,
             h.contacto_nombre AS hogar_contacto, h.direccion AS hogar_direccion
      FROM adopciones a
      LEFT JOIN pacientes p ON a.paciente_id = p.id
      LEFT JOIN hogares_paso h ON a.hogar_paso_id = h.id
      ORDER BY a.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createAdopcion = async (req, res) => {
  try {
    const {
      paciente_id, hogar_paso_id, estado, fecha_ingreso, fecha_adopcion,
      adoptante_nombre, adoptante_telefono, adoptante_email,
      adoptante_direccion, notas, historia_personal
    } = req.body;

    // Evitar duplicados: si ya existe un registro para este paciente, no crear otro
    const existe = await pool.query('SELECT id FROM adopciones WHERE paciente_id=$1', [paciente_id]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'Este animal ya tiene un registro de adopción' });
    }

    const result = await pool.query(`
      INSERT INTO adopciones (
        paciente_id, hogar_paso_id, estado, fecha_ingreso, fecha_adopcion,
        adoptante_nombre, adoptante_telefono, adoptante_email,
        adoptante_direccion, notas, historia_personal
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [
      paciente_id,
      hogar_paso_id || null,
      estado || 'disponible',
      fecha_ingreso || null,
      fecha_adopcion || null,
      adoptante_nombre || null,
      adoptante_telefono || null,
      adoptante_email || null,
      adoptante_direccion || null,
      notas || null,
      historia_personal || null
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateAdopcion = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      paciente_id, hogar_paso_id, estado, fecha_ingreso, fecha_adopcion,
      adoptante_nombre, adoptante_telefono, adoptante_email,
      adoptante_direccion, notas, historia_personal
    } = req.body;

    const result = await pool.query(`
      UPDATE adopciones SET
        paciente_id=$1, hogar_paso_id=$2, estado=$3, fecha_ingreso=$4,
        fecha_adopcion=$5, adoptante_nombre=$6, adoptante_telefono=$7,
        adoptante_email=$8, adoptante_direccion=$9, notas=$10, historia_personal=$11
      WHERE id=$12 RETURNING *
    `, [
      paciente_id,
      hogar_paso_id || null,
      estado,
      fecha_ingreso || null,
      fecha_adopcion || null,
      adoptante_nombre || null,
      adoptante_telefono || null,
      adoptante_email || null,
      adoptante_direccion || null,
      notas || null,
      historia_personal || null,
      id
    ]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteAdopcion = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM adopciones WHERE id=$1', [id]);
    res.json({ mensaje: 'Registro eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Auto-registrar paciente sin dueño en adopciones cuando se crea/actualiza
const autoRegistrarEnAdopciones = async (pacienteId, tipoIngreso) => {
  const sinDueno = ['callejero', 'comunitario', 'abandonado'];
  if (!sinDueno.includes(tipoIngreso)) return;

  const existe = await pool.query('SELECT id FROM adopciones WHERE paciente_id=$1', [pacienteId]);
  if (existe.rows.length === 0) {
    await pool.query(`
      INSERT INTO adopciones (paciente_id, estado, fecha_ingreso)
      VALUES ($1, 'disponible', CURRENT_DATE)
    `, [pacienteId]);
  }
};

module.exports = {
  getHogares, createHogar, updateHogar, deleteHogar,
  getAdopciones, createAdopcion, updateAdopcion, deleteAdopcion,
  autoRegistrarEnAdopciones
};