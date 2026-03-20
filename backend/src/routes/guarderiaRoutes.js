const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verificarToken } = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/guarderiaController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/')),
  filename: (req, file, cb) => cb(null, 'guarderia_' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/config',                   verificarToken, ctrl.getConfig);
router.put('/config',                   verificarToken, ctrl.updateConfig);
router.get('/aforo',                    verificarToken, ctrl.getAforo);

router.get('/estancias',                verificarToken, ctrl.getEstancias);
router.get('/estancias/:id',            verificarToken, ctrl.getEstanciaById);
router.post('/estancias',               verificarToken, ctrl.createEstancia);
router.put('/estancias/:id',            verificarToken, ctrl.updateEstancia);

router.post('/registros',               verificarToken, ctrl.addRegistroDiario);
router.put('/registros/:id',            verificarToken, ctrl.updateRegistroDiario);

router.post('/documentos',              verificarToken, upload.single('archivo'), ctrl.subirDocumento);
router.delete('/documentos/:id',        verificarToken, ctrl.deleteDocumento);

module.exports = router;