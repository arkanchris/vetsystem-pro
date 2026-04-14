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

// ── CATEGORÍAS ────────────────────────────────────────────────────────────────
const getCategorias = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categorias_financieras WHERE activo=true ORDER BY tipo, nombre'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── GET movimientos ───────────────────────────────────────────────────────────
const getMovimientos = async (req, res) => {
  try {
    const clienteId = await getClienteId(req.usuario);
    if (!clienteId) return res.json([]);

    const { desde, hasta, tipo } = req.query;
    let where = ['m.cliente_id=$1'];
    let params = [clienteId];
    let i = 2;

    if (desde) { where.push(`m.fecha >= $${i++}`); params.push(desde); }
    if (hasta) { where.push(`m.fecha <= $${i++}`); params.push(hasta); }
    if (tipo)  { where.push(`m.tipo = $${i++}`);   params.push(tipo);  }

    const result = await pool.query(`
      SELECT m.*, c.nombre as categoria_nombre, u.nombre as usuario_nombre
      FROM movimientos_financieros m
      LEFT JOIN categorias_financieras c ON m.categoria_id = c.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY m.fecha DESC, m.created_at DESC
    `, params);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── CREAR movimiento ──────────────────────────────────────────────────────────
const createMovimiento = async (req, res) => {
  try {
    const clienteId = await getClienteId(req.usuario);
    const { tipo, categoria_id, concepto, monto, fecha, referencia_tipo, referencia_id, notas } = req.body;

    let result;
    try {
      result = await pool.query(`
        INSERT INTO movimientos_financieros
          (tipo, categoria_id, concepto, monto, fecha, referencia_tipo, referencia_id, usuario_id, notas, cliente_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
      `, [
        tipo,
        categoria_id || null,
        concepto,
        parseFloat(monto),
        fecha || new Date().toISOString().split('T')[0],
        referencia_tipo || 'manual',
        referencia_id   || null,
        req.usuario.id,
        notas || null,
        clienteId
      ]);
    } catch (e) {
      console.warn('Movimiento sin cliente_id:', e.message);
      result = await pool.query(`
        INSERT INTO movimientos_financieros
          (tipo, categoria_id, concepto, monto, fecha, referencia_tipo, referencia_id, usuario_id, notas)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
      `, [
        tipo,
        categoria_id || null,
        concepto,
        parseFloat(monto),
        fecha || new Date().toISOString().split('T')[0],
        referencia_tipo || 'manual',
        referencia_id   || null,
        req.usuario.id,
        notas || null
      ]);
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('createMovimiento error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── ACTUALIZAR movimiento ─────────────────────────────────────────────────────
const updateMovimiento = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, categoria_id, concepto, monto, fecha, notas } = req.body;

    const result = await pool.query(`
      UPDATE movimientos_financieros SET
        tipo=$1, categoria_id=$2, concepto=$3, monto=$4, fecha=$5, notas=$6
      WHERE id=$7 RETURNING *
    `, [tipo, categoria_id || null, concepto, parseFloat(monto), fecha, notas || null, id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('updateMovimiento error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── ELIMINAR movimiento ───────────────────────────────────────────────────────
const deleteMovimiento = async (req, res) => {
  try {
    await pool.query('DELETE FROM movimientos_financieros WHERE id=$1', [req.params.id]);
    res.json({ mensaje: 'Eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── RESUMEN financiero ────────────────────────────────────────────────────────
// BUG CORREGIDO: antes era WHERE cliente_id=$1 AND fecha BETWEEN $1 AND $2
// (el $1 estaba repetido, comparaba fechas contra clienteId)
const getResumen = async (req, res) => {
  try {
    const clienteId = await getClienteId(req.usuario);
    if (!clienteId) {
      return res.json({ total_ingresos: 0, total_gastos: 0, utilidad: 0, por_categoria: [] });
    }

    const { desde, hasta } = req.query;
    const fechaDesde = desde || new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                                  .toISOString().split('T')[0];
    const fechaHasta = hasta || new Date().toISOString().split('T')[0];

    // $1=clienteId  $2=fechaDesde  $3=fechaHasta
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0    END), 0) as total_ingresos,
        COALESCE(SUM(CASE WHEN tipo='gasto'   THEN monto ELSE 0    END), 0) as total_gastos,
        COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE -monto END), 0) as utilidad
      FROM movimientos_financieros
      WHERE cliente_id=$1 AND fecha BETWEEN $2 AND $3
    `, [clienteId, fechaDesde, fechaHasta]);

    const porCategoria = await pool.query(`
      SELECT c.nombre, c.tipo, COALESCE(SUM(m.monto), 0) as total
      FROM movimientos_financieros m
      LEFT JOIN categorias_financieras c ON m.categoria_id = c.id
      WHERE m.cliente_id=$1 AND m.fecha BETWEEN $2 AND $3
      GROUP BY c.nombre, c.tipo
      ORDER BY total DESC
    `, [clienteId, fechaDesde, fechaHasta]);

    res.json({
      ...result.rows[0],
      por_categoria: porCategoria.rows,
      desde: fechaDesde,
      hasta: fechaHasta
    });
  } catch (error) {
    console.error('getResumen error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Auto-registrar ingreso cuando se confirma pago de cita
const registrarIngresoCita = async (citaId, monto, concepto, usuarioId, clienteId) => {
  if (!monto || monto <= 0) return;
  try {
    const cat = await pool.query(
      `SELECT id FROM categorias_financieras WHERE nombre='Consultas veterinarias' LIMIT 1`
    );
    await pool.query(`
      INSERT INTO movimientos_financieros
        (tipo, categoria_id, concepto, monto, referencia_tipo, referencia_id, usuario_id, cliente_id)
      VALUES ('ingreso', $1, $2, $3, 'cita', $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [cat.rows[0]?.id || null, concepto || 'Consulta veterinaria', monto, citaId, usuarioId, clienteId]);
  } catch (err) {
    console.error('Error registrarIngresoCita:', err.message);
  }
};

module.exports = {
  getCategorias,
  getMovimientos, createMovimiento, updateMovimiento, deleteMovimiento,
  getResumen,
  registrarIngresoCita
};