const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// ✅ CONFIGURACIÓN CORS CORRECTA
const allowedOrigins = [
  'http://localhost:5173',
  'https://vetsystem-pro.vercel.app',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('No permitido por CORS'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// RUTAS
const authRoutes           = require('./routes/authRoutes');
const propietarioRoutes    = require('./routes/propietarioRoutes');
const pacienteRoutes       = require('./routes/pacienteRoutes');
const historiaRoutes       = require('./routes/historiaRoutes');
const medicamentoRoutes    = require('./routes/medicamentoRoutes');
const citaRoutes           = require('./routes/citaRoutes');
const configuracionRoutes  = require('./routes/configuracionRoutes');
const adopcionRoutes       = require('./routes/adopcionRoutes');
const medicoRoutes         = require('./routes/medicoRoutes');
const financieroRoutes     = require('./routes/financieroRoutes');
const tiendaRoutes         = require('./routes/tiendaRoutes');
const vacunaRoutes         = require('./routes/vacunaRoutes');
const modulosRoutes        = require('./routes/modulosRoutes');
const groomingRoutes       = require('./routes/groomingRoutes');
const adiestramientoRoutes = require('./routes/adiestramientoRoutes');
const hospitalizacionRoutes= require('./routes/hospitalizacionRoutes');
const guarderiaRoutes      = require('./routes/guarderiaRoutes');
const fichaTecnicaRoutes   = require('./routes/fichaTecnicaRoutes');

// USO DE RUTAS
app.use('/api/auth',           authRoutes);
app.use('/api/propietarios',   propietarioRoutes);
app.use('/api/pacientes',      pacienteRoutes);
app.use('/api/historias',      historiaRoutes);
app.use('/api/medicamentos',   medicamentoRoutes);
app.use('/api/citas',          citaRoutes);
app.use('/api/configuracion',  configuracionRoutes);
app.use('/api/adopciones',     adopcionRoutes);
app.use('/api/medicos',        medicoRoutes);
app.use('/api/finanzas',       financieroRoutes);
app.use('/api/tienda',         tiendaRoutes);
app.use('/api/vacunas',        vacunaRoutes);
app.use('/api/modulos',        modulosRoutes);
app.use('/api/grooming',       groomingRoutes);
app.use('/api/adiestramiento', adiestramientoRoutes);
app.use('/api/hospitalizacion',hospitalizacionRoutes);
app.use('/api/guarderia',      guarderiaRoutes);
app.use('/api/fichas',         fichaTecnicaRoutes);

// TEST
app.get('/', (req, res) => {
  res.json({ mensaje: '🐾 VetSystem Pro API funcionando' });
});

// SERVIDOR
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});