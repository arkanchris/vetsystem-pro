const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verificarToken } = require('../middlewares/authMiddleware');
const { getMedicos, createMedico, updateMedico, deleteMedico } = require('../controllers/medicoController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/')),
  filename: (req, file, cb) => cb(null, 'firma_medico_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const soloAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
  next();
};

router.get('/', verificarToken, getMedicos);
router.post('/', verificarToken, soloAdmin, upload.single('firma'), createMedico);
router.put('/:id', verificarToken, soloAdmin, upload.single('firma'), updateMedico);
router.delete('/:id', verificarToken, soloAdmin, deleteMedico);

module.exports = router;