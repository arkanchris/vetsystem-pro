import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

export default function Layout() {
  const { usuario, cargando } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#eef2f7' }}>
        <div className="text-center">
          <span className="text-6xl">🐾</span>
          <p className="mt-4 text-gray-600 font-medium">Cargando VetSystem Pro...</p>
        </div>
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" />;

  return (
    <>
      {/* CSS global para ocultar scrollbar del sidebar sin perder funcionalidad */}
      <style>{`
        .sidebar-scroll {
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;        /* Firefox — oculta scrollbar */
          -ms-overflow-style: none;     /* IE / Edge — oculta scrollbar */
        }
        .sidebar-scroll::-webkit-scrollbar {
          display: none;                /* Chrome / Safari / Opera — oculta scrollbar */
        }
      `}</style>

      <div className="flex min-h-screen" style={{ backgroundColor: '#eef2f7' }}>

        {/* SIDEBAR DESKTOP — siempre visible en pantallas >= md */}
        <div className="hidden md:block flex-shrink-0">
          <Sidebar />
        </div>

        {/* OVERLAY MÓVIL — fondo oscuro al abrir menú */}
        {menuAbierto && (
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setMenuAbierto(false)}
          />
        )}

        {/* SIDEBAR MÓVIL — panel deslizante SIN scrollbar visible */}
        <div
          className="sidebar-scroll fixed top-0 left-0 z-50 md:hidden"
          style={{
            width: '260px',
            height: '100dvh',
            transform: menuAbierto ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease',
          }}>
          <Sidebar onCerrar={() => setMenuAbierto(false)} />
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* BARRA SUPERIOR MÓVIL */}
          <header
            className="md:hidden flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ background: 'linear-gradient(90deg, #1e2d5a 0%, #162347 100%)' }}>

            {/* Botón hamburguesa */}
            <button
              onClick={() => setMenuAbierto(v => !v)}
              style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer' }}
              aria-label="Abrir menú">
              <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2.5"
                strokeLinecap="round">
                <line x1="3" y1="6"  x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Logo */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xl">🐾</span>
              <span className="text-white font-bold text-base truncate">VetSystem Pro</span>
            </div>

            {/* Avatar */}
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: '#3b82f6', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'white', fontWeight: 'bold',
              fontSize: '14px', flexShrink: 0,
            }}>
              {usuario?.nombre?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </header>

          {/* PÁGINA ACTUAL */}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>

        </div>
      </div>
    </>
  );
}