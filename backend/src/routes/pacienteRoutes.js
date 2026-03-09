const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verificarToken } = require('../middlewares/authMiddleware');
const {
  getPacientes, getPacienteById, createPaciente,
  updatePaciente, deletePaciente, searchPacientes
} = require('../controllers/pacienteController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'src/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/', verificarToken, getPacientes);
router.get('/search', verificarToken, searchPacientes);
router.get('/:id', verificarToken, getPacienteById);
router.post('/', verificarToken, upload.single('foto'), createPaciente);
router.put('/:id', verificarToken, updatePaciente);
router.delete('/:id', verificarToken, deletePaciente);

module.exports = router;