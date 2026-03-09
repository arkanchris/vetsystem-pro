const pool = require('../config/database');

const parseFecha = (fecha) => {
  if (!fecha) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
    const [dia, mes, anio] = fecha.split('/');
    return `${anio}-${mes}-${dia}`;
  }
  return fecha;
};

const getMedicamentos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM medicamentos WHERE activo = true ORDER BY nombre ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getMedicamentos:', error);
    res.status(500).json({ error: error.message });
  }
};

const getMedicamentoById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM medicamentos WHERE id=$1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Medicamento no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getMedicamentoById:', error);
    res.status(500).json({ error: error.message });
  }
};

const createMedicamento = async (req, res) => {
  try {
    const { nombre, descripcion, categoria, unidad, stock, stock_minimo, precio, fecha_vencimiento } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del medicamento es requerido' });
    }

    const result = await pool.query(`
      INSERT INTO medicamentos (nombre, descripcion, categoria, unidad, stock, stock_minimo, precio, fecha_vencimiento)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      nombre,
      descripcion || null,
      categoria || null,
      unidad || null,
      stock !== undefined && stock !== '' ? parseFloat(stock) : 0,
      stock_minimo !== undefined && stock_minimo !== '' ? parseFloat(stock_minimo) : 0,
      precio !== undefined && precio !== '' ? parseFloat(precio) : 0,
      parseFecha(fecha_vencimiento)
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error createMedicamento:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateMedicamento = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, categoria, unidad, stock, stock_minimo, precio, fecha_vencimiento } = req.body;

    const result = await pool.query(`
      UPDATE medicamentos SET nombre=$1, descripcion=$2, categoria=$3,
      unidad=$4, stock=$5, stock_minimo=$6, precio=$7, fecha_vencimiento=$8
      WHERE id=$9 RETURNING *
    `, [
      nombre,
      descripcion || null,
      categoria || null,
      unidad || null,
      stock !== undefined && stock !== '' ? parseFloat(stock) : 0,
      stock_minimo !== undefined && stock_minimo !== '' ? parseFloat(stock_minimo) : 0,
      precio !== undefined && precio !== '' ? parseFloat(precio) : 0,
      parseFecha(fecha_vencimiento),
      id
    ]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Medicamento no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updateMedicamento:', error);
    res.status(500).json({ error: error.message });
  }
};

const deleteMedicamento = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE medicamentos SET activo=false WHERE id=$1', [id]);
    res.json({ mensaje: 'Medicamento eliminado' });
  } catch (error) {
    console.error('Error deleteMedicamento:', error);
    res.status(500).json({ error: error.message });
  }
};

const getStockBajo = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM medicamentos 
      WHERE activo=true AND stock <= stock_minimo
      ORDER BY stock ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getStockBajo:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getMedicamentos, getMedicamentoById, createMedicamento, updateMedicamento, deleteMedicamento, getStockBajo };