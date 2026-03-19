import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken]     = useState(null);
  const [modulos, setModulos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const u = localStorage.getItem('usuario');
    const t = localStorage.getItem('token');
    const m = localStorage.getItem('modulos');
    if (u && t) {
      setUsuario(JSON.parse(u));
      setToken(t);
      setModulos(m ? JSON.parse(m) : []);
    }
    setCargando(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, usuario } = res.data;
    const mods = usuario.modulos || [];
    localStorage.setItem('token',   token);
    localStorage.setItem('usuario', JSON.stringify(usuario));
    localStorage.setItem('modulos', JSON.stringify(mods));
    setToken(token);
    setUsuario(usuario);
    setModulos(mods);
    return usuario;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('modulos');
    setToken(null);
    setUsuario(null);
    setModulos([]);
  };

  // ¿El usuario tiene acceso a este módulo?
  const tieneModulo = (clave) => {
    if (usuario?.rol === 'master') return true;
    return modulos.includes(clave);
  };

  return (
    <AuthContext.Provider value={{ usuario, token, modulos, login, logout, cargando, tieneModulo }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);