const pool = require('../config/database');

const getMedicamentos = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM medicamentos WHERE activo = true ORDER BY nombre ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: '❌ Error al obtener medicamentos.' });
  }
};

const getMedicamentoById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM medicamentos WHERE id = $1', [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ Medicamento no encontrado.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: '❌ Error al obtener medicamento.' });
  }
};

const createMedicamento = async (req, res) => {
  const { nombre, descripcion, categoria, unidad, 
          stock, stock_minimo, precio, fecha_vencimiento } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO medicamentos 
      (nombre, descripcion, categoria, unidad, stock, stock_minimo, precio, fecha_vencimiento)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [nombre, descripcion, categoria, unidad, stock, stock_minimo, precio, fecha_vencimiento]);
    res.status(201).json({
      mensaje: '✅ Medicamento creado exitosamente',
      medicamento: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: '❌ Error al crear medicamento.' });
  }
};

const updateMedicamento = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, categoria, unidad,
          stock, stock_minimo, precio, fecha_vencimiento } = req.body;
  try {
    const result = await pool.query(`
      UPDATE medicamentos SET nombre=$1, descripcion=$2, categoria=$3,
      unidad=$4, stock=$5, stock_minimo=$6, precio=$7, fecha_vencimiento=$8
      WHERE id=$9 RETURNING *
    `, [nombre, descripcion, categoria, unidad, stock, stock_minimo, precio, fecha_vencimiento, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '❌ Medicamento no encontrado.' });
    }
    res.json({ mensaje: '✅ Medicamento actualizado', medicamento: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: '❌ Error al actualizar medicamento.' });
  }
};

const deleteMedicamento = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE medicamentos SET activo = false WHERE id = $1', [id]);
    res.json({ mensaje: '✅ Medicamento eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: '❌ Error al eliminar medicamento.' });
  }
};

const getStockBajo = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM medicamentos WHERE stock <= stock_minimo AND activo = true'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: '❌ Error al obtener stock bajo.' });
  }
};

module.exports = { 
  getMedicamentos, getMedicamentoById, createMedicamento, 
  updateMedicamento, deleteMedicamento, getStockBajo 
};