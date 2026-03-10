const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verificarToken } = require('../middlewares/authMiddleware');
const { getProductos, createProducto, updateProducto, deleteProducto, getVentas, createVenta, venderMedicamento, getVentasMedicamentos } = require('../controllers/tiendaController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/')),
  filename: (req, file, cb) => cb(null, 'prod_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const soloAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
  next();
};

// Productos
router.get('/productos', verificarToken, getProductos);
router.post('/productos', verificarToken, soloAdmin, upload.single('imagen'), createProducto);
router.put('/productos/:id', verificarToken, soloAdmin, upload.single('imagen'), updateProducto);
router.delete('/productos/:id', verificarToken, soloAdmin, deleteProducto);

// Ventas tienda
router.get('/ventas', verificarToken, getVentas);
router.post('/ventas', verificarToken, createVenta);

// Ventas medicamentos
router.get('/ventas-medicamentos', verificarToken, getVentasMedicamentos);
router.post('/ventas-medicamentos', verificarToken, venderMedicamento);

module.exports = router;