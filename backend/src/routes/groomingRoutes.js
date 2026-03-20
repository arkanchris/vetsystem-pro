const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verificarToken } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/groomingController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/')),
  filename: (req, file, cb) => cb(null, 'grooming_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Catálogo
router.get('/catalogo',           verificarToken, ctrl.getCatalogo);
router.post('/catalogo',          verificarToken, ctrl.createServicio);
router.put('/catalogo/:id',       verificarToken, ctrl.updateServicio);
router.delete('/catalogo/:id',    verificarToken, ctrl.deleteServicio);

// Citas
router.get('/citas',              verificarToken, ctrl.getCitas);
router.post('/citas',             verificarToken, ctrl.createCita);
router.put('/citas/:id',          verificarToken, ctrl.updateCita);
router.delete('/citas/:id',       verificarToken, ctrl.deleteCita);
router.post('/citas/:id/foto',    verificarToken, upload.single('foto'), ctrl.subirFoto);

// Historial paciente
router.get('/historial/:paciente_id', verificarToken, ctrl.getHistorialPaciente);

module.exports = router;