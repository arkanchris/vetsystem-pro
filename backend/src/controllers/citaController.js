const pool = require('../config/database');

const parseFechaCita = (fecha) => {
  if (!fecha) return null;
  if (/^\d{2}\/\d{2}\/\d{4}/.test(fecha)) {
    const [datePart, timePart] = fecha.split(' ');
    const [dia, mes, anio] = datePart.split('/');
    return `${anio}-${mes}-${dia}${timePart ? ' ' + timePart : ''}`;
  }
  return fecha;
};

const getCitas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*,
             p.nombre as paciente_nombre, p.especie as paciente_especie,
             p.foto_url as paciente_foto,
             pr.nombre as propietario_nombre, pr.apellido as propietario_apellido,
             pr.telefono as propietario_telefono
      FROM citas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      LEFT JOIN propietarios pr ON p.propietario_id = pr.id
      ORDER BY c.fecha_cita DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getCitas:', error);
    res.status(500).json({ error: error.message });
  }
};

const getCitaById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT c.*, p.nombre as paciente_nombre, p.especie as paciente_especie
      FROM citas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      WHERE c.id = $1
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verificar disponibilidad (no cruzar horarios, bloques de 30 min)
const checkDisponibilidad = async (req, res) => {
  try {
    const { fecha_cita, excluir_id } = req.query;
    if (!fecha_cita) return res.json({ disponible: true });

    const query = excluir_id
      ? `SELECT id, fecha_cita, motivo FROM citas
         WHERE ABS(EXTRACT(EPOCH FROM (fecha_cita - $1::timestamp))) < 1800
         AND estado NOT IN ('cancelada') AND id != $2`
      : `SELECT id, fecha_cita, motivo FROM citas
         WHERE ABS(EXTRACT(EPOCH FROM (fecha_cita - $1::timestamp))) < 1800
         AND estado NOT IN ('cancelada')`;

    const params = excluir_id ? [fecha_cita, excluir_id] : [fecha_cita];
    const result = await pool.query(query, params);

    res.json({
      disponible: result.rows.length === 0,
      conflictos: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createCita = async (req, res) => {
  try {
    const {
      paciente_id, fecha_cita, motivo, estado, notas,
      costo, estado_pago, metodo_pago
    } = req.body;

    if (!paciente_id || !fecha_cita || !motivo) {
      return res.status(400).json({ error: 'paciente_id, fecha_cita y motivo son requeridos' });
    }

    const result = await pool.query(`
      INSERT INTO citas (paciente_id, usuario_id, fecha_cita, motivo, estado, notas, costo, estado_pago, metodo_pago)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      parseInt(paciente_id),
      req.usuario.id,
      parseFechaCita(fecha_cita),
      motivo,
      estado || 'pendiente',
      notas || null,
      costo ? parseFloat(costo) : 0,
      estado_pago || 'pendiente_pago',
      metodo_pago || null
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error createCita:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateCita = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      paciente_id, fecha_cita, motivo, estado, notas,
      costo, estado_pago, metodo_pago
    } = req.body;

    const result = await pool.query(`
      UPDATE citas SET
        paciente_id=$1, fecha_cita=$2, motivo=$3, estado=$4, notas=$5,
        costo=$6, estado_pago=$7, metodo_pago=$8
      WHERE id=$9 RETURNING *
    `, [
      parseInt(paciente_id),
      parseFechaCita(fecha_cita),
      motivo,
      estado,
      notas || null,
      costo ? parseFloat(costo) : 0,
      estado_pago || 'pendiente_pago',
      metodo_pago || null,
      id
    ]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Marcar como "en consulta" (paciente llegó) y crear historia clínica vacía
const marcarAsistido = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Actualizar estado de la cita
    const cita = await pool.query(
      `UPDATE citas SET estado='en_consulta' WHERE id=$1 RETURNING *`, [id]
    );
    if (cita.rows.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });

    const citaData = cita.rows[0];

    // 2. Verificar si ya existe historia para esta cita
    const historiaExiste = await pool.query(
      `SELECT id FROM historia_clinica WHERE paciente_id=$1 AND fecha::date = $2::date`,
      [citaData.paciente_id, citaData.fecha_cita]
    );

    let historiaId = null;
    if (historiaExiste.rows.length === 0) {
      // 3. Crear historia clínica vacía con el motivo de la cita
      const historia = await pool.query(`
        INSERT INTO historia_clinica (paciente_id, usuario_id, motivo_consulta, fecha)
        VALUES ($1, $2, $3, $4) RETURNING id
      `, [
        citaData.paciente_id,
        req.usuario.id,
        citaData.motivo,
        citaData.fecha_cita
      ]);
      historiaId = historia.rows[0].id;
    } else {
      historiaId = historiaExiste.rows[0].id;
    }

    res.json({ cita: citaData, historia_id: historiaId });
  } catch (error) {
    console.error('Error marcarAsistido:', error);
    res.status(500).json({ error: error.message });
  }
};

const deleteCita = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM citas WHERE id=$1', [id]);
    res.json({ mensaje: 'Cita eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCitasHoy = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, p.nombre as paciente_nombre, p.foto_url as paciente_foto
      FROM citas c
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      WHERE DATE(c.fecha_cita) = CURRENT_DATE
      ORDER BY c.fecha_cita ASC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getCitas, getCitaById, createCita, updateCita, deleteCita,
  getCitasHoy, checkDisponibilidad, marcarAsistido
};