const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verificarToken } = require('../middlewares/authMiddleware');
const {
  getUsuarios, createUsuario, updateUsuario, deleteUsuario,
  getConfiguracion, updateConfiguracion
} = require('../controllers/configuracionController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'src/uploads/'),
  filename: (req, file, cb) => cb(null, 'firma_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/usuarios', verificarToken, getUsuarios);
router.post('/usuarios', verificarToken, createUsuario);
router.put('/usuarios/:id', verificarToken, updateUsuario);
router.delete('/usuarios/:id', verificarToken, deleteUsuario);

router.get('/', verificarToken, getConfiguracion);
router.put('/', verificarToken, upload.single('firma'), updateConfiguracion);

module.exports = router;