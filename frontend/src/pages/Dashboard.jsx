import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Dashboard() {
  const { usuario } = useAuth();
  const [stats, setStats] = useState({
    pacientes: 0, propietarios: 0, citas: 0, medicamentos: 0
  });

  useEffect(() => {
    const cargarStats = async () => {
      try {
        const [pac, prop, cit, med] = await Promise.all([
          api.get('/pacientes'),
          api.get('/propietarios'),
          api.get('/citas'),
          api.get('/medicamentos'),
        ]);
        setStats({
          pacientes: pac.data.length,
          propietarios: prop.data.length,
          citas: cit.data.length,
          medicamentos: med.data.length,
        });
      } catch (err) {
        console.error(err);
      }
    };
    cargarStats();
  }, []);

  const tarjetas = [
    { titulo: 'Pacientes', valor: stats.pacientes, icono: '🐾', color: 'from-blue-500 to-blue-600' },
    { titulo: 'Propietarios', valor: stats.propietarios, icono: '👨‍👩‍👧', color: 'from-green-500 to-green-600' },
    { titulo: 'Citas', valor: stats.citas, icono: '📅', color: 'from-purple-500 to-purple-600' },
    { titulo: 'Medicamentos', valor: stats.medicamentos, icono: '💊', color: 'from-orange-500 to-orange-600' },
  ];

  return (
    <div className="p-6">
      {/* Bienvenida */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          ¡Bienvenido, {usuario?.nombre}! 👋
        </h1>
        <p className="text-gray-500 mt-1">Resumen del sistema veterinario</p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {tarjetas.map((t) => (
          <div key={t.titulo} className={`bg-gradient-to-r ${t.color} rounded-2xl p-6 text-white shadow-lg`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">{t.titulo}</p>
                <p className="text-4xl font-bold mt-1">{t.valor}</p>
              </div>
              <span className="text-5xl opacity-80">{t.icono}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Info del sistema */}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🏥 Sistema VetSystem Pro</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="font-semibold text-blue-800">📋 Módulos Activos</p>
            <ul className="mt-2 text-sm text-blue-600 space-y-1">
              <li>✅ Gestión de Pacientes</li>
              <li>✅ Historia Clínica</li>
              <li>✅ Inventario</li>
              <li>✅ Citas Médicas</li>
            </ul>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="font-semibold text-green-800">👤 Tu cuenta</p>
            <ul className="mt-2 text-sm text-green-600 space-y-1">
              <li>📧 {usuario?.email}</li>
              <li>🔑 Rol: {usuario?.rol}</li>
              <li>✅ Sesión activa</li>
            </ul>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="font-semibold text-purple-800">🚀 Versión</p>
            <ul className="mt-2 text-sm text-purple-600 space-y-1">
              <li>VetSystem Pro v1.0.0</li>
              <li>Backend: Node.js</li>
              <li>DB: PostgreSQL</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}