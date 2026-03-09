import { useState, useEffect } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

export default function Configuracion() {
  const [tab, setTab] = useState('clinica');
  const [config, setConfig] = useState({
    clinica_nombre: '', clinica_direccion: '',
    clinica_telefono: '', clinica_email: '', firma_medico_url: ''
  });
  const [firmaFile, setFirmaFile] = useState(null);
  const [firmaPreview, setFirmaPreview] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [modalUsuario, setModalUsuario] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState(null);
  const [formUsuario, setFormUsuario] = useState({
    nombre: '', email: '', password: '', rol: 'veterinario', activo: true
  });

  useEffect(() => {
    cargarConfig();
    cargarUsuarios();
  }, []);

  const cargarConfig = async () => {
    try {
      const res = await api.get('/configuracion');
      setConfig(res.data);
      if (res.data.firma_medico_url)
        setFirmaPreview(`http://localhost:5000${res.data.firma_medico_url}`);
    } catch (err) {
      toast.error('Error al cargar configuración');
    }
  };

  const cargarUsuarios = async () => {
    try {
      const res = await api.get('/configuracion/usuarios');
      setUsuarios(res.data);
    } catch (err) {
      toast.error('Error al cargar usuarios');
    }
  };

  const handleFirmaChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFirmaFile(file);
    setFirmaPreview(URL.createObjectURL(file));
  };

  const guardarConfig = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(config).forEach(([k, v]) => {
        if (k !== 'firma_medico_url') formData.append(k, v || '');
      });
      if (firmaFile) formData.append('firma', firmaFile);
      await api.put('/configuracion', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('✅ Configuración guardada');
      cargarConfig();
    } catch (err) {
      toast.error('Error al guardar');
    }
  };

  const abrirModalUsuario = (u = null) => {
    if (u) {
      setEditandoUsuario(u);
      setFormUsuario({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, activo: u.activo });
    } else {
      setEditandoUsuario(null);
      setFormUsuario({ nombre: '', email: '', password: '', rol: 'veterinario', activo: true });
    }
    setModalUsuario(true);
  };

  const handleSubmitUsuario = async (e) => {
    e.preventDefault();
    try {
      if (editandoUsuario) {
        await api.put(`/configuracion/usuarios/${editandoUsuario.id}`, formUsuario);
        toast.success('✅ Usuario actualizado');
      } else {
        if (!formUsuario.password)
          return toast.error('La contraseña es requerida');
        await api.post('/configuracion/usuarios', formUsuario);
        toast.success('✅ Usuario creado');
      }
      setModalUsuario(false);
      cargarUsuarios();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar usuario');
    }
  };

  const desactivarUsuario = async (id) => {
    if (!confirm('¿Desactivar este usuario?')) return;
    try {
      await api.delete(`/configuracion/usuarios/${id}`);
      toast.success('Usuario desactivado');
      cargarUsuarios();
    } catch (err) {
      toast.error('Error');
    }
  };

  const tabs = [
    { id: 'clinica', label: '🏥 Clínica', },
    { id: 'usuarios', label: '👥 Usuarios', },
  ];

  return (
    <div className="p-6">
      <Toaster position="top-right" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">⚙️ Configuración</h1>
        <p className="text-gray-500">Administra tu clínica y usuarios del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl shadow p-2 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-lg font-medium transition text-sm ${
              tab === t.id ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB CLÍNICA */}
      {tab === 'clinica' && (
        <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
          <h2 className="text-lg font-bold text-gray-800 mb-4">🏥 Datos de la Clínica</h2>
          <form onSubmit={guardarConfig} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Clínica</label>
              <input value={config.clinica_nombre || ''} onChange={e => setConfig({...config, clinica_nombre: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input value={config.clinica_direccion || ''} onChange={e => setConfig({...config, clinica_direccion: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input value={config.clinica_telefono || ''} onChange={e => setConfig({...config, clinica_telefono: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={config.clinica_email || ''} onChange={e => setConfig({...config, clinica_email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            {/* Firma del médico */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">✍️ Firma del Médico</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {firmaPreview ? (
                  <div className="space-y-2">
                    <img src={firmaPreview} alt="firma" className="max-h-24 mx-auto object-contain" />
                    <div className="flex gap-2 justify-center">
                      <label className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-800">
                        Cambiar firma
                        <input type="file" accept="image/*" onChange={handleFirmaChange} className="hidden" />
                      </label>
                      <span className="text-gray-400">|</span>
                      <button type="button" onClick={() => { setFirmaFile(null); setFirmaPreview(null); setConfig({...config, firma_medico_url: ''}); }}
                        className="text-sm text-red-500 hover:text-red-700">Quitar</button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="text-gray-400 text-sm">
                      <div className="text-3xl mb-1">✍️</div>
                      <p>Clic para subir la firma del médico</p>
                      <p className="text-xs mt-1">PNG con fondo transparente recomendado</p>
                    </div>
                    <input type="file" accept="image/*" onChange={handleFirmaChange} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <button type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-medium transition">
              💾 Guardar Configuración
            </button>
          </form>
        </div>
      )}

      {/* TAB USUARIOS */}
      {tab === 'usuarios' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">👥 Usuarios del Sistema</h2>
            <button onClick={() => abrirModalUsuario()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm">
              + Nuevo Usuario
            </button>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Nombre', 'Email', 'Rol', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>{u.rol}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => abrirModalUsuario(u)}
                          className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-sm hover:bg-yellow-200">
                          ✏️ Editar
                        </button>
                        {u.activo && (
                          <button onClick={() => desactivarUsuario(u.id)}
                            className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm hover:bg-red-200">
                            🚫 Desactivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal usuario */}
          {modalUsuario && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-bold text-gray-800">
                    {editandoUsuario ? '✏️ Editar Usuario' : '👤 Nuevo Usuario'}
                  </h2>
                </div>
                <form onSubmit={handleSubmitUsuario} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                    <input value={formUsuario.nombre} onChange={e => setFormUsuario({...formUsuario, nombre: e.target.value})}
                      required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" value={formUsuario.email} onChange={e => setFormUsuario({...formUsuario, email: e.target.value})}
                      required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña {editandoUsuario ? '(dejar vacío para no cambiar)' : '*'}
                    </label>
                    <input type="password" value={formUsuario.password} onChange={e => setFormUsuario({...formUsuario, password: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                    <select value={formUsuario.rol} onChange={e => setFormUsuario({...formUsuario, rol: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="veterinario">Veterinario</option>
                      <option value="auxiliar">Auxiliar</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  {editandoUsuario && (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="activo" checked={formUsuario.activo}
                        onChange={e => setFormUsuario({...formUsuario, activo: e.target.checked})}
                        className="w-4 h-4 text-indigo-600" />
                      <label htmlFor="activo" className="text-sm text-gray-700">Usuario activo</label>
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setModalUsuario(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button type="submit"
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                      {editandoUsuario ? 'Actualizar' : 'Crear'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
