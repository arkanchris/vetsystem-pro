const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verificarToken } = require('../middlewares/authMiddleware');
const {
  getPacientes, getPacienteById, getHojaVida,
  createPaciente, updatePaciente, deletePaciente, searchPacientes
} = require('../controllers/pacienteController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'src/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype))
      return cb(null, true);
    cb(new Error('Solo se permiten imágenes'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/', verificarToken, getPacientes);
router.get('/search', verificarToken, searchPacientes);
router.get('/:id/hoja-vida', verificarToken, getHojaVida);
router.get('/:id', verificarToken, getPacienteById);

router.post('/', verificarToken, (req, res, next) => {
  upload.single('foto')(req, res, (err) => { if (err) return res.status(400).json({ error: err.message }); next(); });
}, createPaciente);

router.put('/:id', verificarToken, (req, res, next) => {
  upload.single('foto')(req, res, (err) => { if (err) return res.status(400).json({ error: err.message }); next(); });
}, updatePaciente);

router.delete('/:id', verificarToken, deletePaciente);

module.exports = router;