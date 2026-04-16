import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function MenuItem({ to, icono, label, onClick }) {
  return (
    <NavLink to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          isActive ? 'bg-white/20 text-white shadow-sm' : 'text-blue-100 hover:bg-white/10 hover:text-white'
        }`}>
      <span className="text-lg">{icono}</span>
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ onCerrar }) {
  const { usuario, logout, tieneModulo } = useAuth();
  const navigate = useNavigate();

  const esMaster = usuario?.rol === 'master';
  const esAdmin  = ['admin', 'admin_veterinario'].includes(usuario?.rol) || esMaster;

  // Al hacer clic en un ítem del menú, cierra el sidebar en móvil
  const cerrar = () => { if (onCerrar) onCerrar(); };

  const handleLogout = () => {
    cerrar();
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-60 min-h-screen flex flex-col shadow-2xl"
      style={{ background: 'linear-gradient(180deg, #1e2d5a 0%, #162347 100%)' }}>

      {/* ── CABECERA: Logo + botón cerrar en móvil ── */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-xl">🐾</div>
            <div>
              <h1 className="text-white font-bold text-base leading-tight">VetSystem Pro</h1>
              <p className="text-blue-300 text-xs">
                {esMaster ? '✨ Máster' : (usuario?.clinica_nombre || 'Gestión Veterinaria')}
              </p>
            </div>
          </div>

          {/* Botón X para cerrar — solo visible en móvil */}
          {onCerrar && (
            <button
              onClick={cerrar}
              className="md:hidden text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all"
              aria-label="Cerrar menú">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6"  x2="6"  y2="18" />
                <line x1="6"  y1="6"  x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── USUARIO ── */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white
            ${esMaster ? 'bg-yellow-500' : 'bg-blue-500'}`}>
            {usuario?.nombre?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{usuario?.nombre}</p>
            <p className={`text-xs capitalize ${esMaster ? 'text-yellow-300' : 'text-blue-300'}`}>
              {esMaster ? '⭐ Máster' : usuario?.rol}
            </p>
          </div>
        </div>
      </div>

      {/* ── NAVEGACIÓN ── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

        {esMaster && (
          <>
            <p className="text-yellow-400 text-xs font-semibold px-2 uppercase tracking-wider mb-2">
              ⭐ Panel Máster
            </p>
            <MenuItem to="/master" icono="🔧" label="Gestión de Clientes" onClick={cerrar} />
            <div className="border-t border-white/10 my-3" />
          </>
        )}

        <p className="text-blue-400 text-xs font-semibold px-2 uppercase tracking-wider mb-2">Sistema</p>

        {tieneModulo('dashboard')    && <MenuItem to="/dashboard"    icono="📊" label="Dashboard"       onClick={cerrar} />}
        {tieneModulo('pacientes')    && <MenuItem to="/pacientes"    icono="🐾" label="Pacientes"       onClick={cerrar} />}
        {tieneModulo('tutores')      && <MenuItem to="/propietarios" icono="👤" label="Tutores"         onClick={cerrar} />}
        {tieneModulo('historias')    && <MenuItem to="/historias"    icono="📋" label="Historia Clínica" onClick={cerrar} />}
        {tieneModulo('medicamentos') && <MenuItem to="/medicamentos" icono="💊" label="Medicamentos"    onClick={cerrar} />}
        {tieneModulo('citas')        && <MenuItem to="/citas"        icono="📅" label="Citas"           onClick={cerrar} />}
        {tieneModulo('adopciones')   && <MenuItem to="/adopciones"   icono="🏠" label="Adopciones"      onClick={cerrar} />}
        {tieneModulo('tienda')          && <MenuItem to="/tienda"          icono="🛍️" label="Tienda"          onClick={cerrar} />}
        {tieneModulo('grooming')        && <MenuItem to="/grooming"        icono="✂️"  label="Estética"        onClick={cerrar} />}
        {tieneModulo('adiestramiento')  && <MenuItem to="/adiestramiento"  icono="🎓" label="Adiestramiento"  onClick={cerrar} />}
        {tieneModulo('hospitalizacion') && <MenuItem to="/hospitalizacion" icono="🏥" label="Hospitalización" onClick={cerrar} />}
        {tieneModulo('guarderia')       && <MenuItem to="/guarderia"       icono="🏡" label="Guardería"       onClick={cerrar} />}

        {tieneModulo('finanzas') && (
          <>
            <div className="border-t border-white/10 my-3" />
            <p className="text-blue-400 text-xs font-semibold px-2 uppercase tracking-wider mb-2">Finanzas</p>
            <MenuItem to="/finanzas" icono="💰" label="Ingresos & Gastos" onClick={cerrar} />
          </>
        )}

        {(esAdmin || tieneModulo('configuracion')) && (
          <>
            <div className="border-t border-white/10 my-3" />
            <p className="text-blue-400 text-xs font-semibold px-2 uppercase tracking-wider mb-2">Admin</p>
            <MenuItem to="/configuracion" icono="⚙️" label="Configuración" onClick={cerrar} />
          </>
        )}
      </nav>

      {/* ── LOGOUT ── */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-blue-200
            hover:bg-red-500/20 hover:text-red-300 transition-all text-sm font-medium">
          <span>🚪</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}