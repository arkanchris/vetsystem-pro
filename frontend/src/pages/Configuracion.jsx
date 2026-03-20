import { useState, useEffect, useRef, useContext } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';

export default function Configuracion() {
  const { usuario } = useContext(AuthContext);
  const esAdmin = usuario?.rol === 'admin';

  const [tab, setTab] = useState('clinica');
  const [config, setConfig] = useState({});
  const [usuarios, setUsuarios] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [logoPreview, setLogoPreview] = useState(null);
  const [firmaPreview, setFirmaPreview] = useState(null);
  const [archivoLogo, setArchivoLogo] = useState(null);
  const [archivoFirma, setArchivoFirma] = useState(null);
  const logoRef = useRef(null);
  const firmaRef = useRef(null);

  // Modal usuario
  const [modalUsuario, setModalUsuario] = useState(false);
  const [editandoUsuario, setEditandoUsuario] = useState(null);
  const [formUsuario, setFormUsuario] = useState({ nombre: '', email: '', password: '', rol: 'auxiliar', activo: true, puede_ver_finanzas: false });

  // Modal médico
  const [modalMedico, setModalMedico] = useState(false);
  const [editandoMedico, setEditandoMedico] = useState(null);
  const [formMedico, setFormMedico] = useState({ nombre: '', especialidad: '', registro_profesional: '', usuario_id: '' });
  const [firmaPreviewMedico, setFirmaPreviewMedico] = useState(null);
  const [archivoFirmaMedico, setArchivoFirmaMedico] = useState(null);
  const firmaRefMedico = useRef(null);

  useEffect(() => { cargarTodo(); }, []);

  const cargarTodo = async () => {
    try {
      const [conf, usrs, meds] = await Promise.all([
        api.get('/configuracion'),
        esAdmin ? api.get('/auth/usuarios') : Promise.resolve({ data: [] }),
        api.get('/medicos')
      ]);
      const confMap = {};
      (conf.data || []).forEach(c => { confMap[c.clave] = c.valor; });
      setConfig(confMap);
      if (confMap.clinica_logo_url) setLogoPreview(`http://localhost:5000${confMap.clinica_logo_url}`);
      if (confMap.firma_medico_url) setFirmaPreview(`http://localhost:5000${confMap.firma_medico_url}`);
      setUsuarios(usrs.data);
      setMedicos(meds.data);
    } catch (err) {
      toast.error('Error al cargar configuración');
    }
  };

  const guardarConfig = async () => {
    try {
      const fd = new FormData();
      Object.entries(config).forEach(([k, v]) => fd.append(k, v || ''));
      if (archivoLogo) fd.append('logo', archivoLogo);
      if (archivoFirma) fd.append('firma', archivoFirma);
      await api.put('/configuracion', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('✅ Configuración guardada');
      cargarTodo();
    } catch (err) {
      toast.error('Error al guardar');
    }
  };

  // ── USUARIOS ──────────────────────────────────────────────────────────────
  const desactivarUsuario = async (u) => {
    if (!confirm(`¿Desactivar a "${u.nombre}"?\n\nPodrás reactivarlo editándolo.`)) return;
    try {
      await api.put(`/auth/usuarios/${u.id}`, { ...u, activo: false });
      toast.success('✅ Usuario desactivado');
      const usrs = await api.get('/auth/usuarios');
      setUsuarios(usrs.data);
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const reactivarUsuario = async (u) => {
    try {
      await api.put(`/auth/usuarios/${u.id}`, { ...u, activo: true });
      toast.success('✅ Usuario reactivado');
      const usrs = await api.get('/auth/usuarios');
      setUsuarios(usrs.data);
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const eliminarUsuarioDefinitivo = async (u) => {
    if (!['auxiliar','veterinario'].includes(u.rol))
      return toast.error('Solo puedes eliminar usuarios auxiliares o veterinarios');
    if (!confirm(`⚠️ ELIMINAR DEFINITIVAMENTE a "${u.nombre}"?\n\nEsta acción NO se puede deshacer.`)) return;
    if (!confirm(`¿Confirmas eliminar permanentemente a "${u.nombre}"?`)) return;
    try {
      await api.delete(`/auth/usuarios/${u.id}/eliminar`);
      toast.success('✅ Usuario eliminado definitivamente');
      const usrs = await api.get('/auth/usuarios');
      setUsuarios(usrs.data);
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const abrirModalUsuario = (u = null) => {
    if (u) {
      setEditandoUsuario(u);
      setFormUsuario({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, activo: u.activo, puede_ver_finanzas: u.puede_ver_finanzas || false });
    } else {
      setEditandoUsuario(null);
      setFormUsuario({ nombre: '', email: '', password: '', rol: 'auxiliar', activo: true, puede_ver_finanzas: false });
    }
    setModalUsuario(true);
  };

  const handleSubmitUsuario = async (e) => {
    e.preventDefault();
    try {
      const datos = { ...formUsuario };
      if (!datos.password) delete datos.password;
      if (editandoUsuario) {
        await api.put(`/auth/usuarios/${editandoUsuario.id}`, datos);
        toast.success('✅ Usuario actualizado');
      } else {
        await api.post('/auth/usuarios', datos);
        toast.success('✅ Usuario creado');
      }
      setModalUsuario(false);
      cargarTodo();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar usuario');
    }
  };

  // ── MÉDICOS ───────────────────────────────────────────────────────────────
  const abrirModalMedico = (m = null) => {
    setFirmaPreviewMedico(null);
    setArchivoFirmaMedico(null);
    if (m) {
      setEditandoMedico(m);
      setFormMedico({ nombre: m.nombre, especialidad: m.especialidad || '', registro_profesional: m.registro_profesional || '', usuario_id: m.usuario_id || '' });
      if (m.firma_url) setFirmaPreviewMedico(`http://localhost:5000${m.firma_url}`);
    } else {
      setEditandoMedico(null);
      setFormMedico({ nombre: '', especialidad: '', registro_profesional: '', usuario_id: '' });
    }
    setModalMedico(true);
  };

  const handleSubmitMedico = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(formMedico).forEach(([k, v]) => fd.append(k, v));
      if (archivoFirmaMedico) fd.append('firma', archivoFirmaMedico);
      if (editandoMedico) {
        await api.put(`/medicos/${editandoMedico.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('✅ Médico actualizado');
      } else {
        await api.post('/medicos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('✅ Médico registrado');
      }
      setModalMedico(false);
      cargarTodo();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar médico');
    }
  };

  const eliminarMedico = async (id) => {
    if (!confirm('¿Desactivar este médico?')) return;
    try {
      await api.delete(`/medicos/${id}`);
      toast.success('Médico desactivado');
      cargarTodo();
    } catch (err) { toast.error('Error'); }
  };

  const TABS = [
    { id: 'clinica', label: '🏥 Clínica', solo_admin: false },
    { id: 'medicos', label: '👨‍⚕️ Médicos', solo_admin: false },
    { id: 'usuarios', label: '👥 Usuarios', solo_admin: true },
  ];

  return (
    <div className="p-6">
      <Toaster position="top-right" />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">⚙️ Configuración</h1>
        <p className="text-gray-500">Ajustes del sistema veterinario</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl shadow p-2 w-fit">
        {TABS.filter(t => !t.solo_admin || esAdmin).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-lg font-medium transition text-sm ${
              tab === t.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB CLÍNICA ═══════════════════════════════════════════════════ */}
      {tab === 'clinica' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Logo */}
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-bold text-gray-800 mb-4">🖼️ Logo de la Clínica</h3>
            <div className="flex flex-col items-center gap-3">
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                  : <span className="text-4xl">🏥</span>}
              </div>
              <button onClick={() => logoRef.current?.click()}
                className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-100 text-sm">
                📷 {logoPreview ? 'Cambiar logo' : 'Subir logo'}
              </button>
              {logoPreview && (
                <button onClick={() => { setLogoPreview(null); setArchivoLogo(null); setConfig({...config, clinica_logo_url: ''}); }}
                  className="text-xs text-red-400 hover:text-red-600">Quitar logo</button>
              )}
              <input ref={logoRef} type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const f = e.target.files[0];
                  if (!f) return;
                  setArchivoLogo(f);
                  const r = new FileReader();
                  r.onload = ev => setLogoPreview(ev.target.result);
                  r.readAsDataURL(f);
                }} />
              <p className="text-xs text-gray-400 text-center">Aparecerá en la interfaz y en los documentos impresos</p>
            </div>
          </div>

          {/* Datos de la clínica */}
          <div className="bg-white rounded-xl shadow p-5 lg:col-span-2">
            <h3 className="font-bold text-gray-800 mb-4">🏥 Datos de la Clínica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { clave: 'clinica_nombre', label: 'Nombre de la Clínica', placeholder: 'VetSystem Pro' },
                { clave: 'clinica_nit', label: 'NIT / RUT', placeholder: 'Ej: 900.123.456-7' },
                { clave: 'clinica_telefono', label: 'Teléfono', placeholder: '+57 300 000 0000' },
                { clave: 'clinica_email', label: 'Email', placeholder: 'clinica@email.com' },
              ].map(f => (
                <div key={f.clave}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input value={config[f.clave] || ''} placeholder={f.placeholder}
                    onChange={e => setConfig({...config, [f.clave]: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input value={config['clinica_direccion'] || ''} placeholder="Dirección completa"
                  onChange={e => setConfig({...config, clinica_direccion: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <button onClick={guardarConfig}
              className="mt-5 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium">
              💾 Guardar configuración
            </button>
          </div>
        </div>
      )}

      {/* ═══ TAB MÉDICOS ═══════════════════════════════════════════════════ */}
      {tab === 'medicos' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">👨‍⚕️ Médicos Veterinarios</h2>
              <p className="text-sm text-gray-500">Cada médico tiene su firma para documentos e historias clínicas</p>
            </div>
            {esAdmin && (
              <button onClick={() => abrirModalMedico()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
                + Agregar Médico
              </button>
            )}
          </div>

          {medicos.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center">
              <div className="text-5xl mb-3">👨‍⚕️</div>
              <p className="text-gray-500">No hay médicos registrados</p>
              {esAdmin && (
                <button onClick={() => abrirModalMedico()}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                  Agregar primer médico
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medicos.map(m => (
                <div key={m.id} className="bg-white rounded-xl shadow p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">👨‍⚕️</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{m.nombre}</h3>
                      {m.especialidad && <p className="text-sm text-gray-500">{m.especialidad}</p>}
                      {m.registro_profesional && <p className="text-xs text-gray-400">Reg: {m.registro_profesional}</p>}
                    </div>
                  </div>
                  {/* Firma */}
                  <div className="border border-gray-100 rounded-lg p-3 mb-4 bg-gray-50">
                    <p className="text-xs text-gray-500 mb-2">Firma digital:</p>
                    {m.firma_url ? (
                      <img src={`http://localhost:5000${m.firma_url}`} alt="Firma"
                        className="h-16 object-contain mx-auto" />
                    ) : (
                      <p className="text-xs text-gray-400 text-center italic">Sin firma cargada</p>
                    )}
                  </div>
                  {esAdmin && (
                    <div className="flex gap-2">
                      <button onClick={() => abrirModalMedico(m)}
                        className="flex-1 bg-yellow-100 text-yellow-700 py-1.5 rounded-lg text-sm hover:bg-yellow-200">
                        ✏️ Editar
                      </button>
                      <button onClick={() => eliminarMedico(m.id)}
                        className="flex-1 bg-red-100 text-red-700 py-1.5 rounded-lg text-sm hover:bg-red-200">
                        🗑️ Quitar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB USUARIOS — solo admin ═══════════════════════════════════ */}
      {tab === 'usuarios' && esAdmin && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">👥 Usuarios del Sistema</h2>
              <p className="text-sm text-gray-500">Solo el administrador puede crear y gestionar usuarios</p>
            </div>
            <button onClick={() => abrirModalUsuario()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
              + Nuevo Usuario
            </button>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Nombre','Usuario','Email','Rol','Finanzas','Estado','Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{u.nombre}</p>
                      {u.username && <p className="text-xs text-blue-500 font-mono">@{u.username}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.rol === 'admin' ? 'bg-red-100 text-red-700' :
                        u.rol === 'veterinario' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>{u.rol}</span>
                    </td>
                    <td className="px-4 py-3">
                      {u.puede_ver_finanzas
                        ? <span className="text-green-600 text-xs font-medium">✅ Sí</span>
                        : <span className="text-gray-400 text-xs">— No</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => abrirModalUsuario(u)}
                          className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-lg text-xs hover:bg-yellow-200 font-medium">
                          ✏️ Editar
                        </button>
                        {u.activo ? (
                          <button onClick={() => desactivarUsuario(u)}
                            className="bg-orange-100 text-orange-600 px-2.5 py-1 rounded-lg text-xs hover:bg-orange-200 font-medium"
                            title="Desactivar">
                            🔕
                          </button>
                        ) : (
                          <button onClick={() => reactivarUsuario(u)}
                            className="bg-green-100 text-green-600 px-2.5 py-1 rounded-lg text-xs hover:bg-green-200 font-medium"
                            title="Reactivar">
                            ✅
                          </button>
                        )}
                        {['auxiliar','veterinario'].includes(u.rol) && (
                          <button onClick={() => eliminarUsuarioDefinitivo(u)}
                            className="bg-red-100 text-red-600 px-2.5 py-1 rounded-lg text-xs hover:bg-red-200 font-medium"
                            title="Eliminar definitivamente">
                            ❌
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ MODAL MÉDICO ══════════════════════════════════════════════════ */}
      {modalMedico && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold text-gray-800">{editandoMedico ? '✏️ Editar Médico' : '👨‍⚕️ Nuevo Médico'}</h2>
            </div>
            <form onSubmit={handleSubmitMedico} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input value={formMedico.nombre} onChange={e => setFormMedico({...formMedico, nombre: e.target.value})}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                  <input value={formMedico.especialidad} onChange={e => setFormMedico({...formMedico, especialidad: e.target.value})}
                    placeholder="Ej: Cirugía, Etología..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. Registro</label>
                  <input value={formMedico.registro_profesional} onChange={e => setFormMedico({...formMedico, registro_profesional: e.target.value})}
                    placeholder="Ej: MV-12345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vincular a usuario</label>
                <select value={formMedico.usuario_id} onChange={e => setFormMedico({...formMedico, usuario_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sin usuario vinculado</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>)}
                </select>
              </div>
              {/* Firma del médico */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Firma digital</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                  {firmaPreviewMedico ? (
                    <>
                      <img src={firmaPreviewMedico} alt="Firma" className="h-20 object-contain mx-auto mb-2" />
                      <button type="button" onClick={() => { setFirmaPreviewMedico(null); setArchivoFirmaMedico(null); }}
                        className="text-xs text-red-400 hover:text-red-600">Quitar firma</button>
                    </>
                  ) : (
                    <p className="text-gray-400 text-sm">Sin firma cargada</p>
                  )}
                  <button type="button" onClick={() => firmaRefMedico.current?.click()}
                    className="mt-2 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-200 block mx-auto">
                    📷 {firmaPreviewMedico ? 'Cambiar firma' : 'Subir firma'}
                  </button>
                  <input ref={firmaRefMedico} type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const f = e.target.files[0];
                      if (!f) return;
                      setArchivoFirmaMedico(f);
                      const r = new FileReader();
                      r.onload = ev => setFirmaPreviewMedico(ev.target.result);
                      r.readAsDataURL(f);
                    }} />
                  <p className="text-xs text-gray-400 mt-1">Se mostrará en historias clínicas e impresiones</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalMedico(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  {editandoMedico ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL USUARIO ════════════════════════════════════════════════ */}
      {modalUsuario && esAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold text-gray-800">{editandoUsuario ? '✏️ Editar Usuario' : '👤 Nuevo Usuario'}</h2>
            </div>
            <form onSubmit={handleSubmitUsuario} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input value={formUsuario.nombre} onChange={e => setFormUsuario({...formUsuario, nombre: e.target.value})}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={formUsuario.email} onChange={e => setFormUsuario({...formUsuario, email: e.target.value})}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editandoUsuario ? 'Contraseña (dejar en blanco para no cambiar)' : 'Contraseña *'}
                </label>
                <input type="password" value={formUsuario.password} onChange={e => setFormUsuario({...formUsuario, password: e.target.value})}
                  required={!editandoUsuario}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select value={formUsuario.rol} onChange={e => setFormUsuario({...formUsuario, rol: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="auxiliar">Auxiliar</option>
                  <option value="veterinario">Veterinario</option>
                </select>
              </div>
              {/* Permisos extra */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-blue-700">🔐 Permisos adicionales</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formUsuario.puede_ver_finanzas}
                    onChange={e => setFormUsuario({...formUsuario, puede_ver_finanzas: e.target.checked})}
                    className="w-4 h-4 accent-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Ver módulo de Finanzas</p>
                    <p className="text-xs text-gray-500">Permite ver ingresos, gastos y reportes financieros</p>
                  </div>
                </label>
              </div>
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formUsuario.activo}
                    onChange={e => setFormUsuario({...formUsuario, activo: e.target.checked})}
                    className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Usuario activo</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalUsuario(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  {editandoUsuario ? 'Actualizar' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}