import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [usuario,  setUsuario]  = useState(null);
  const [token,    setToken]    = useState(null);
  const [modulos,  setModulos]  = useState([]);
  const [cargando, setCargando] = useState(true); // ← empieza en true hasta leer localStorage

  // Al montar, recuperar sesión del localStorage
  useEffect(() => {
    try {
      const u = localStorage.getItem('usuario');
      const t = localStorage.getItem('token');
      const m = localStorage.getItem('modulos');
      if (u && t) {
        setUsuario(JSON.parse(u));
        setToken(t);
        setModulos(m ? JSON.parse(m) : []);
      }
    } catch (e) {
      // Si hay datos corruptos en localStorage, limpiar
      console.warn('Error leyendo sesión, limpiando...', e.message);
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      localStorage.removeItem('modulos');
    } finally {
      setCargando(false); // ← SIEMPRE marcar como listo
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: tk, usuario: u } = res.data;
    const mods = u.modulos || [];
    localStorage.setItem('token',   tk);
    localStorage.setItem('usuario', JSON.stringify(u));
    localStorage.setItem('modulos', JSON.stringify(mods));
    setToken(tk);
    setUsuario(u);
    setModulos(mods);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('modulos');
    setToken(null);
    setUsuario(null);
    setModulos([]);
  };

  // Actualizar datos del usuario en contexto y localStorage (para firma, cargo, etc.)
  const actualizarUsuario = (nuevosDatos) => {
    const actualizado = { ...usuario, ...nuevosDatos };
    localStorage.setItem('usuario', JSON.stringify(actualizado));
    setUsuario(actualizado);
  };

  const tieneModulo = (clave) => {
    if (usuario?.rol === 'master') return true;
    return modulos.includes(clave);
  };

  return (
    <AuthContext.Provider value={{
      usuario, token, modulos,
      login, logout, actualizarUsuario,
      cargando, tieneModulo
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);