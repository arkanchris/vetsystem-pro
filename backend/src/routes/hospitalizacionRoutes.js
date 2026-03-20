const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/hospitalizacionController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/')),
  filename: (req, file, cb) => cb(null, 'hosp_doc_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/jaulas',                    verificarToken, ctrl.getJaulas);
router.post('/jaulas',                   verificarToken, ctrl.createJaula);
router.put('/jaulas/:id',                verificarToken, ctrl.updateJaula);

router.get('/',                          verificarToken, ctrl.getHospitalizaciones);
router.get('/:id',                       verificarToken, ctrl.getHospitalizacionById);
router.post('/',                         verificarToken, ctrl.createHospitalizacion);
router.put('/:id',                       verificarToken, ctrl.updateHospitalizacion);

router.post('/evoluciones',              verificarToken, ctrl.addEvolucion);
router.delete('/evoluciones/:id',        verificarToken, ctrl.deleteEvolucion);

router.post('/medicamentos',             verificarToken, ctrl.addMedicamento);
router.delete('/medicamentos/:id',       verificarToken, ctrl.deleteMedicamento);

// Documentos adjuntos
router.post('/documentos',               verificarToken, upload.single('archivo'), ctrl.subirDocumentoHosp);
router.delete('/documentos/:id',         verificarToken, ctrl.deleteDocumentoHosp);

// Historial clínico del paciente
router.get('/historiales/:paciente_id',  verificarToken, ctrl.getHistorialesPaciente);

module.exports = router;