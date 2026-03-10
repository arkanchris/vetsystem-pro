const pool = require('../config/database');

// ── CATEGORÍAS ──────────────────────────────────────────────────────────────
const getCategorias = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias_financieras WHERE activo=true ORDER BY tipo, nombre');
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// ── MOVIMIENTOS ─────────────────────────────────────────────────────────────
const getMovimientos = async (req, res) => {
  try {
    const { desde, hasta, tipo } = req.query;
    let where = ['1=1'];
    let params = [];
    let i = 1;
    if (desde) { where.push(`m.fecha >= $${i++}`); params.push(desde); }
    if (hasta) { where.push(`m.fecha <= $${i++}`); params.push(hasta); }
    if (tipo)  { where.push(`m.tipo = $${i++}`); params.push(tipo); }

    const result = await pool.query(`
      SELECT m.*, c.nombre as categoria_nombre, u.nombre as usuario_nombre
      FROM movimientos_financieros m
      LEFT JOIN categorias_financieras c ON m.categoria_id = c.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY m.fecha DESC, m.created_at DESC
    `, params);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const createMovimiento = async (req, res) => {
  try {
    const { tipo, categoria_id, concepto, monto, fecha, referencia_tipo, referencia_id, notas } = req.body;
    const result = await pool.query(`
      INSERT INTO movimientos_financieros (tipo, categoria_id, concepto, monto, fecha, referencia_tipo, referencia_id, usuario_id, notas)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [tipo, categoria_id||null, concepto, parseFloat(monto), fecha||new Date().toISOString().split('T')[0],
        referencia_tipo||'manual', referencia_id||null, req.usuario.id, notas||null]);
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const updateMovimiento = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, categoria_id, concepto, monto, fecha, notas } = req.body;
    const result = await pool.query(`
      UPDATE movimientos_financieros SET tipo=$1, categoria_id=$2, concepto=$3, monto=$4, fecha=$5, notas=$6
      WHERE id=$7 RETURNING *
    `, [tipo, categoria_id||null, concepto, parseFloat(monto), fecha, notas||null, id]);
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const deleteMovimiento = async (req, res) => {
  try {
    await pool.query('DELETE FROM movimientos_financieros WHERE id=$1', [req.params.id]);
    res.json({ mensaje: 'Eliminado' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const getResumen = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const fechaDesde = desde || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const fechaHasta = hasta || new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END), 0) as total_ingresos,
        COALESCE(SUM(CASE WHEN tipo='gasto' THEN monto ELSE 0 END), 0) as total_gastos,
        COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE -monto END), 0) as utilidad
      FROM movimientos_financieros
      WHERE fecha BETWEEN $1 AND $2
    `, [fechaDesde, fechaHasta]);

    const porCategoria = await pool.query(`
      SELECT c.nombre, c.tipo, COALESCE(SUM(m.monto),0) as total
      FROM movimientos_financieros m
      LEFT JOIN categorias_financieras c ON m.categoria_id = c.id
      WHERE m.fecha BETWEEN $1 AND $2
      GROUP BY c.nombre, c.tipo
      ORDER BY total DESC
    `, [fechaDesde, fechaHasta]);

    res.json({ ...result.rows[0], por_categoria: porCategoria.rows, desde: fechaDesde, hasta: fechaHasta });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// Auto-registrar ingreso cuando se confirma pago de una cita
const registrarIngresoCita = async (citaId, monto, concepto, usuarioId) => {
  if (!monto || monto <= 0) return;
  try {
    const cat = await pool.query(`SELECT id FROM categorias_financieras WHERE nombre='Consultas veterinarias' LIMIT 1`);
    await pool.query(`
      INSERT INTO movimientos_financieros (tipo, categoria_id, concepto, monto, referencia_tipo, referencia_id, usuario_id)
      VALUES ('ingreso', $1, $2, $3, 'cita', $4, $5)
      ON CONFLICT DO NOTHING
    `, [cat.rows[0]?.id||null, concepto||'Consulta veterinaria', monto, citaId, usuarioId]);
  } catch (err) { console.error('Error registrarIngresoCita:', err.message); }
};

module.exports = { getCategorias, getMovimientos, createMovimiento, updateMovimiento, deleteMovimiento, getResumen, registrarIngresoCita };