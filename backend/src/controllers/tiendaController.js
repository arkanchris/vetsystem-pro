const pool = require('../config/database');

// ── PRODUCTOS ────────────────────────────────────────────────────────────────
const getProductos = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos_tienda WHERE activo=true ORDER BY categoria, nombre');
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const createProducto = async (req, res) => {
  try {
    const { nombre, descripcion, categoria, precio, stock, stock_minimo } = req.body;
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;
    const result = await pool.query(`
      INSERT INTO productos_tienda (nombre, descripcion, categoria, precio, stock, stock_minimo, imagen_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [nombre, descripcion||null, categoria||'otro', parseFloat(precio)||0,
        parseInt(stock)||0, parseInt(stock_minimo)||5, imagen_url]);
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, categoria, precio, stock, stock_minimo } = req.body;
    let q, p;
    if (req.file) {
      q = `UPDATE productos_tienda SET nombre=$1,descripcion=$2,categoria=$3,precio=$4,stock=$5,stock_minimo=$6,imagen_url=$7 WHERE id=$8 RETURNING *`;
      p = [nombre, descripcion||null, categoria||'otro', parseFloat(precio)||0, parseInt(stock)||0, parseInt(stock_minimo)||5, `/uploads/${req.file.filename}`, id];
    } else {
      q = `UPDATE productos_tienda SET nombre=$1,descripcion=$2,categoria=$3,precio=$4,stock=$5,stock_minimo=$6 WHERE id=$7 RETURNING *`;
      p = [nombre, descripcion||null, categoria||'otro', parseFloat(precio)||0, parseInt(stock)||0, parseInt(stock_minimo)||5, id];
    }
    const result = await pool.query(q, p);
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const deleteProducto = async (req, res) => {
  try {
    await pool.query('UPDATE productos_tienda SET activo=false WHERE id=$1', [req.params.id]);
    res.json({ mensaje: 'Producto desactivado' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// ── VENTAS ───────────────────────────────────────────────────────────────────
const getVentas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*, u.nombre as vendedor, p.nombre as paciente_nombre,
             json_agg(json_build_object(
               'producto', pr.nombre, 'cantidad', d.cantidad,
               'precio_unitario', d.precio_unitario, 'subtotal', d.subtotal
             )) as items
      FROM ventas_tienda v
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      LEFT JOIN pacientes p ON v.paciente_id = p.id
      LEFT JOIN ventas_tienda_detalle d ON d.venta_id = v.id
      LEFT JOIN productos_tienda pr ON d.producto_id = pr.id
      GROUP BY v.id, u.nombre, p.nombre
      ORDER BY v.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const createVenta = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { paciente_id, metodo_pago, estado_pago, notas, items } = req.body;

    if (!items || items.length === 0) throw new Error('Sin productos');

    let total = 0;
    for (const item of items) {
      // Verificar stock
      const prod = await client.query('SELECT stock, precio FROM productos_tienda WHERE id=$1', [item.producto_id]);
      if (prod.rows.length === 0) throw new Error(`Producto ${item.producto_id} no existe`);
      if (prod.rows[0].stock < item.cantidad) throw new Error(`Stock insuficiente para producto ${item.producto_id}`);
      total += prod.rows[0].precio * item.cantidad;
    }

    // Crear venta
    const venta = await client.query(`
      INSERT INTO ventas_tienda (usuario_id, paciente_id, total, metodo_pago, estado_pago, notas)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [req.usuario.id, paciente_id||null, total, metodo_pago||null, estado_pago||'pagado', notas||null]);

    const ventaId = venta.rows[0].id;

    for (const item of items) {
      const prod = await client.query('SELECT precio FROM productos_tienda WHERE id=$1', [item.producto_id]);
      const precioUnit = prod.rows[0].precio;
      const subtotal = precioUnit * item.cantidad;
      await client.query(`
        INSERT INTO ventas_tienda_detalle (venta_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES ($1,$2,$3,$4,$5)
      `, [ventaId, item.producto_id, item.cantidad, precioUnit, subtotal]);
      // Descontar stock
      await client.query('UPDATE productos_tienda SET stock = stock - $1 WHERE id=$2', [item.cantidad, item.producto_id]);
    }

    // Registrar ingreso financiero
    const cat = await client.query(`SELECT id FROM categorias_financieras WHERE nombre='Venta tienda' LIMIT 1`);
    await client.query(`
      INSERT INTO movimientos_financieros (tipo, categoria_id, concepto, monto, referencia_tipo, referencia_id, usuario_id)
      VALUES ('ingreso', $1, 'Venta tienda #${ventaId}', $2, 'venta_tienda', $3, $4)
    `, [cat.rows[0]?.id||null, total, ventaId, req.usuario.id]);

    await client.query('COMMIT');
    res.status(201).json(venta.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// ── VENTA DE MEDICAMENTOS ────────────────────────────────────────────────────
const venderMedicamento = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { paciente_id, cita_id, medicamento_id, cantidad, metodo_pago, notas } = req.body;

    const med = await client.query('SELECT * FROM medicamentos WHERE id=$1', [medicamento_id]);
    if (med.rows.length === 0) throw new Error('Medicamento no encontrado');
    if (med.rows[0].stock < cantidad) throw new Error('Stock insuficiente');

    const precio = med.rows[0].precio_venta || med.rows[0].precio || 0;
    const subtotal = precio * parseInt(cantidad);

    // Registrar venta
    const venta = await client.query(`
      INSERT INTO ventas_medicamentos (usuario_id, paciente_id, cita_id, medicamento_id, cantidad, precio_unitario, subtotal, metodo_pago, notas)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [req.usuario.id, paciente_id||null, cita_id||null, medicamento_id, parseInt(cantidad), precio, subtotal, metodo_pago||null, notas||null]);

    // Descontar stock
    await client.query('UPDATE medicamentos SET stock = stock - $1 WHERE id=$2', [parseInt(cantidad), medicamento_id]);

    // Registrar ingreso financiero
    const cat = await client.query(`SELECT id FROM categorias_financieras WHERE nombre='Venta medicamentos' LIMIT 1`);
    await client.query(`
      INSERT INTO movimientos_financieros (tipo, categoria_id, concepto, monto, referencia_tipo, referencia_id, usuario_id)
      VALUES ('ingreso', $1, $2, $3, 'venta_medicamento', $4, $5)
    `, [cat.rows[0]?.id||null, `Venta: ${med.rows[0].nombre} x${cantidad}`, subtotal, venta.rows[0].id, req.usuario.id]);

    await client.query('COMMIT');
    res.status(201).json(venta.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

const getVentasMedicamentos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT vm.*, m.nombre as medicamento_nombre, p.nombre as paciente_nombre, u.nombre as vendedor
      FROM ventas_medicamentos vm
      LEFT JOIN medicamentos m ON vm.medicamento_id = m.id
      LEFT JOIN pacientes p ON vm.paciente_id = p.id
      LEFT JOIN usuarios u ON vm.usuario_id = u.id
      ORDER BY vm.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

module.exports = { getProductos, createProducto, updateProducto, deleteProducto, getVentas, createVenta, venderMedicamento, getVentasMedicamentos };