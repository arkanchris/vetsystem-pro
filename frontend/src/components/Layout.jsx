import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

export default function Layout() {
  const { usuario, cargando } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#eef2f7' }}>
        <div className="text-center">
          <span className="text-6xl">🐾</span>
          <p className="mt-4 text-gray-600 font-medium">Cargando VetSystem Pro...</p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#eef2f7' }}>

      {/* ── SIDEBAR DESKTOP: siempre visible ── */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar onCerrar={() => setMenuAbierto(false)} />
      </div>

      {/* ── SIDEBAR MÓVIL: se desliza desde la izquierda ── */}
      {menuAbierto && (
        <>
          {/* Fondo oscuro — al tocar cierra el menú */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMenuAbierto(false)}
          />
          {/* Panel sidebar con scroll propio */}
          <div
            className="fixed top-0 left-0 z-50 md:hidden flex flex-col"
            style={{
              width: '260px',
              height: '100dvh',   /* usa dvh para respetar la barra del navegador móvil */
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch', /* scroll suave en iOS */
            }}>
            <Sidebar onCerrar={() => setMenuAbierto(false)} />
          </div>
        </>
      )}

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Barra superior móvil */}
        <header
          className="md:hidden flex items-center gap-3 px-4 py-3 shadow-sm flex-shrink-0"
          style={{ background: 'linear-gradient(90deg, #1e2d5a 0%, #162347 100%)' }}>

          {/* Botón hamburguesa */}
          <button
            onClick={() => setMenuAbierto(true)}
            className="text-white p-1 rounded-lg hover:bg-white/10 transition-all flex-shrink-0"
            aria-label="Abrir menú">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6"  x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl flex-shrink-0">🐾</span>
            <span className="text-white font-bold text-base truncate">VetSystem Pro</span>
          </div>

          {/* Avatar usuario */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center
              text-white text-sm font-bold">
              {usuario?.nombre?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Página actual */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>

      </div>
    </div>
  );
}