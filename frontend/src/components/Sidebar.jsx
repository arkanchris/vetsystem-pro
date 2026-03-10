import { NavLink, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const MenuItem = ({ to, icono, label }) => (
  <NavLink to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2.5 rounded-xl transition font-medium text-sm ${
        isActive
          ? 'bg-white/20 text-white'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`
    }>
    <span className="text-lg">{icono}</span>
    <span>{label}</span>
  </NavLink>
);

export default function Sidebar() {
  const { usuario, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const esAdmin = usuario?.rol === 'admin';
  const puedeVerFinanzas = esAdmin || usuario?.puede_ver_finanzas;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-56 min-h-screen bg-gradient-to-b from-blue-800 to-blue-900 flex flex-col py-5 px-3">
      {/* Logo y nombre clínica */}
      <div className="mb-6 px-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🐾</span>
          <span className="text-white font-bold text-lg">VetSystem Pro</span>
        </div>
        <p className="text-blue-300 text-xs">Gestión Veterinaria</p>
      </div>

      {/* Usuario actual */}
      <div className="bg-white/10 rounded-xl p-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
            {usuario?.nombre?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">{usuario?.nombre}</p>
            <p className="text-blue-300 text-xs capitalize">{usuario?.rol}</p>
          </div>
        </div>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 space-y-1">
        <MenuItem to="/dashboard"    icono="📊" label="Dashboard" />
        <MenuItem to="/pacientes"    icono="🐾" label="Pacientes" />
        <MenuItem to="/propietarios" icono="👥" label="Tutores" />
        <MenuItem to="/historias"    icono="📋" label="Historia Clínica" />
        <MenuItem to="/medicamentos" icono="💊" label="Medicamentos" />
        <MenuItem to="/citas"        icono="📅" label="Citas" />
        <MenuItem to="/adopciones"   icono="🏠" label="Adopciones" />
        <MenuItem to="/tienda"       icono="🛍️" label="Tienda" />

        {/* Módulo financiero: solo admin o con permiso */}
        {puedeVerFinanzas && (
          <>
            <div className="pt-3 pb-1">
              <p className="text-blue-400 text-xs font-semibold px-2 uppercase tracking-wider">Finanzas</p>
            </div>
            <MenuItem to="/finanzas" icono="💰" label="Ingresos & Gastos" />
          </>
        )}

        {/* Administración */}
        {esAdmin && (
          <>
            <div className="pt-3 pb-1">
              <p className="text-blue-400 text-xs font-semibold px-2 uppercase tracking-wider">Administración</p>
            </div>
            <MenuItem to="/configuracion" icono="⚙️" label="Configuración" />
          </>
        )}
      </nav>

      {/* Cerrar sesión */}
      <button onClick={handleLogout}
        className="mt-4 flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/70 hover:bg-red-500/20 hover:text-red-300 transition font-medium text-sm w-full">
        <span className="text-lg">🚪</span>
        <span>Cerrar Sesión</span>
      </button>
    </div>
  );
}