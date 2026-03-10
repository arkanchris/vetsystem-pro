const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verificarToken } = require('../middlewares/authMiddleware');
const { getConfiguracion, updateConfiguracion } = require('../controllers/configuracionController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/')),
  filename: (req, file, cb) => {
    const prefix = file.fieldname === 'logo' ? 'logo_' : 'firma_clinica_';
    cb(null, prefix + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.get('/', verificarToken, getConfiguracion);
router.put('/', verificarToken, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'firma', maxCount: 1 }
]), updateConfiguracion);

module.exports = router;