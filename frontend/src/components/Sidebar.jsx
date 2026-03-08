import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const menu = [
  { path: '/dashboard', icono: '📊', label: 'Dashboard' },
  { path: '/pacientes', icono: '🐾', label: 'Pacientes' },
  { path: '/propietarios', icono: '👨‍👩‍👧', label: 'Propietarios' },
  { path: '/historias', icono: '📋', label: 'Historia Clínica' },
  { path: '/medicamentos', icono: '💊', label: 'Medicamentos' },
  { path: '/citas', icono: '📅', label: 'Citas' },
];

export default function Sidebar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-64 min-h-screen bg-gradient-to-b from-blue-900 to-blue-800 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-blue-700">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🐾</span>
          <div>
            <h1 className="font-bold text-lg">VetSystem Pro</h1>
            <p className="text-blue-300 text-xs">Gestión Veterinaria</p>
          </div>
        </div>
      </div>

      {/* Usuario */}
      <div className="p-4 border-b border-blue-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
            {usuario?.nombre?.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-sm">{usuario?.nombre}</p>
            <p className="text-blue-300 text-xs capitalize">{usuario?.rol}</p>
          </div>
        </div>
      </div>

      {/* Menú */}
      <nav className="flex-1 p-4 space-y-1">
        {menu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium
              ${isActive
                ? 'bg-white text-blue-900 shadow-lg'
                : 'text-blue-100 hover:bg-blue-700'
              }`
            }
          >
            <span className="text-xl">{item.icono}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-blue-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-100 hover:bg-red-600 transition-all duration-200 text-sm font-medium"
        >
          <span className="text-xl">🚪</span>
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}