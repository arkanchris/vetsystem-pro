import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

const MODULOS_DEF = [
  { clave:'dashboard',      nombre:'Dashboard',        icono:'📊', desc:'Panel de resumen' },
  { clave:'pacientes',      nombre:'Pacientes',        icono:'🐾', desc:'Gestión de mascotas' },
  { clave:'tutores',        nombre:'Tutores',          icono:'👤', desc:'Propietarios y tutores' },
  { clave:'historias',      nombre:'Historia Clínica', icono:'📋', desc:'Historial médico' },
  { clave:'medicamentos',   nombre:'Medicamentos',     icono:'💊', desc:'Inventario' },
  { clave:'citas',          nombre:'Citas',            icono:'📅', desc:'Agenda de citas' },
  { clave:'adopciones',     nombre:'Adopciones',       icono:'🏠', desc:'Gestión de adopciones' },
  { clave:'tienda',         nombre:'Tienda',           icono:'🛍️', desc:'Venta de productos' },
  { clave:'finanzas',       nombre:'Ingresos & Gastos',icono:'💰', desc:'Control financiero' },
  { clave:'configuracion',  nombre:'Configuración',    icono:'⚙️', desc:'Ajustes de clínica' },
  { clave:'grooming',       nombre:'Estética',         icono:'✂️',  desc:'Estética canina y felina' },
  { clave:'adiestramiento', nombre:'Adiestramiento',   icono:'🎓', desc:'Escuela de entrenamiento' },
  { clave:'hospitalizacion',nombre:'Hospitalización',  icono:'🏥', desc:'Pacientes hospitalizados' },
  { clave:'guarderia',      nombre:'Guardería',        icono:'🏡', desc:'Estancias y cuidado diario' },
];
const OBLIGATORIOS = ['dashboard','configuracion'];

export default function PanelMaster() {
  const [tab, setTab]               = useState('clientes');
  const [clientes, setClientes]     = useState([]);
  const [clienteSel, setClienteSel] = useState(null);
  const [adminSel, setAdminSel]     = useState(null);
  const [modulosState, setModulosState] = useState({});
  const [cargando, setCargando]     = useState(true);
  const [guardando, setGuardando]   = useState(false);
  const [busqueda, setBusqueda]     = useState('');

  // Modales
  const [modalCliente, setModalCliente] = useState(false);
  const [modalAdmin, setModalAdmin]     = useState(false);
  const [editandoCliente, setEditandoCliente] = useState(null);

  // Form cliente
  const [formCliente, setFormCliente] = useState({
    nombre:'', nit:'', telefono:'', email:'', direccion:'',
    representante:'', ciudad:'', pais:'Colombia', max_admins: 1
  });
  const [logoFile, setLogoFile]       = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const logoRef = useRef(null);

  // Form admin con username
  const [formAdmin, setFormAdmin] = useState({ nombre:'', email:'', username:'', password:'', confirmar:'' });
  const [editandoAdmin, setEditandoAdmin] = useState(null);
  const [modalVerAdmin, setModalVerAdmin] = useState(null); // para ver info
  const [sugerencias, setSugerencias]   = useState([]);
  const [checkUsername, setCheckUsername] = useState(null); // null | 'ok' | 'taken' | 'checking'

  // Password máster
  const [pwForm, setPwForm] = useState({ actual:'', nuevo:'', confirmar:'' });

  useEffect(() => { cargarClientes(); }, []);

  const cargarClientes = async (q = '') => {
    setCargando(true);
    try {
      const res = await api.get('/modulos/clientes', { params: q ? { busqueda: q } : {} });
      setClientes(res.data);
    } catch { toast.error('Error al cargar clientes'); }
    finally { setCargando(false); }
  };

  // Búsqueda con debounce
  const busquedaTimeout = useRef(null);
  const handleBusqueda = (val) => {
    setBusqueda(val);
    clearTimeout(busquedaTimeout.current);
    busquedaTimeout.current = setTimeout(() => cargarClientes(val), 400);
  };

  const seleccionarCliente = async (c) => {
    setClienteSel(c);
    setAdminSel(null);
    setModulosState({});
    if (c.admins?.length > 0) await cargarModulosAdmin(c.admins[0]);
  };

  const cargarModulosAdmin = async (admin) => {
    setAdminSel(admin);
    try {
      const res = await api.get(`/modulos/admin/${admin.id}`);
      const mapa = {};
      res.data.forEach(m => { mapa[m.clave] = m.activo; });
      setModulosState(mapa);
    } catch { toast.error('Error al cargar módulos'); }
  };

  const toggleModulo = (clave) => {
    if (OBLIGATORIOS.includes(clave)) return;
    setModulosState(prev => ({ ...prev, [clave]: !prev[clave] }));
  };

  const guardarModulos = async () => {
    if (!adminSel) return;
    setGuardando(true);
    try {
      const modulos = MODULOS_DEF.map(m => ({
        clave: m.clave,
        activo: OBLIGATORIOS.includes(m.clave) ? true : (modulosState[m.clave] ?? false)
      }));
      await api.post(`/modulos/admin/${adminSel.id}`, { modulos });
      toast.success(`✅ Módulos de ${clienteSel?.nombre} actualizados`);
      await refrescarClienteSel();
    } catch { toast.error('Error al guardar'); }
    finally { setGuardando(false); }
  };

  const refrescarClienteSel = async () => {
    await cargarClientes(busqueda);
    if (clienteSel) {
      const res = await api.get('/modulos/clientes', { params: busqueda ? { busqueda } : {} });
      const updated = res.data.find(c => c.id === clienteSel.id);
      if (updated) setClienteSel(updated);
    }
  };

  // ── CLIENTE ──────────────────────────────────────────────────────────────────
  const abrirModalCliente = (c = null) => {
    if (c) {
      setEditandoCliente(c);
      setFormCliente({
        nombre:c.nombre||'', nit:c.nit||'', telefono:c.telefono||'',
        email:c.email||'', direccion:c.direccion||'',
        representante:c.representante||'', ciudad:c.ciudad||'',
        pais:c.pais||'Colombia', max_admins:c.max_admins||1
      });
      setLogoPreview(c.logo_url ? `http://localhost:5000${c.logo_url}` : null);
    } else {
      setEditandoCliente(null);
      setFormCliente({ nombre:'', nit:'', telefono:'', email:'', direccion:'', representante:'', ciudad:'', pais:'Colombia', max_admins:1 });
      setLogoPreview(null);
    }
    setLogoFile(null);
    setModalCliente(true);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    const r = new FileReader();
    r.onload = ev => setLogoPreview(ev.target.result);
    r.readAsDataURL(file);
  };

  const handleSubmitCliente = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(formCliente).forEach(([k,v]) => { if (v !== '' && v !== null && v !== undefined) fd.append(k, v); });
      if (logoFile) fd.append('logo', logoFile);
      if (editandoCliente) {
        await api.put(`/modulos/clientes/${editandoCliente.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('✅ Cliente actualizado');
      } else {
        await api.post('/modulos/clientes', fd, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('✅ Cliente creado');
      }
      setModalCliente(false);
      await cargarClientes(busqueda);
    } catch (err) { toast.error(err.response?.data?.error || 'Error al guardar'); }
  };

  const eliminarCliente = async (c) => {
    if (!confirm(`¿Desactivar el cliente "${c.nombre}"?\nTodos sus usuarios también quedarán inactivos.`)) return;
    try {
      await api.delete(`/modulos/clientes/${c.id}`);
      toast.success('✅ Cliente desactivado');
      setClienteSel(null);
      setAdminSel(null);
      await cargarClientes(busqueda);
    } catch (err) { toast.error(err.response?.data?.error || 'Error al eliminar'); }
  };

  const abrirEditarAdmin = (admin) => {
    setEditandoAdmin(admin);
    setFormAdmin({
      nombre: admin.nombre || '',
      email: admin.email || '',
      username: admin.username || '',
      password: '',
      confirmar: ''
    });
    verificarUsername(admin.username || '');
    setModalAdmin(true);
  };

  const handleSubmitAdmin_edit = async (e) => {
    e.preventDefault();
    if (formAdmin.password && formAdmin.password !== formAdmin.confirmar)
      return toast.error('Las contraseñas no coinciden');
    if (formAdmin.password && formAdmin.password.length < 6)
      return toast.error('Mínimo 6 caracteres');
    if (checkUsername === 'taken') return toast.error('Ese username ya está en uso');
    try {
      const datos = {
        nombre: formAdmin.nombre,
        email: formAdmin.email,
        username: formAdmin.username,
        rol: 'admin',
        activo: true,
        puede_ver_finanzas: true
      };
      if (formAdmin.password) datos.password = formAdmin.password;
      await api.put(`/auth/usuarios/${editandoAdmin.id}`, datos);
      toast.success('✅ Admin actualizado');
      setModalAdmin(false);
      setEditandoAdmin(null);
      setFormAdmin({ nombre:'', email:'', username:'', password:'', confirmar:'' });
      setSugerencias([]);
      setCheckUsername(null);
      await refrescarClienteSel();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al actualizar'); }
  };

  const reactivarAdmin = async (admin) => {
    try {
      await api.put(`/auth/usuarios/${admin.id}`, {
        nombre: admin.nombre, email: admin.email,
        username: admin.username, rol: 'admin',
        activo: true, puede_ver_finanzas: true
      });
      toast.success('✅ Admin reactivado');
      await refrescarClienteSel();
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const eliminarAdmin = async (admin) => {
    if (!confirm(`¿Desactivar el usuario admin "${admin.nombre}"?

Podrá reactivarlo después.`)) return;
    try {
      await api.delete(`/modulos/admins/${admin.id}`);
      toast.success('✅ Admin desactivado');
      await refrescarClienteSel();
      setAdminSel(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const eliminarAdminDefinitivo = async (admin) => {
    if (!confirm(`⚠️ ELIMINAR DEFINITIVAMENTE a "${admin.nombre}"?

Esta acción NO se puede deshacer.
Se borrarán todos sus datos y permisos.`)) return;
    if (!confirm(`¿Confirmas que deseas eliminar permanentemente a "${admin.nombre}"?`)) return;
    try {
      await api.delete(`/modulos/admins/${admin.id}/eliminar`);
      toast.success('✅ Admin eliminado definitivamente');
      await refrescarClienteSel();
      setAdminSel(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  // ── ADMIN + USERNAME ──────────────────────────────────────────────────────────
  const pedirSugerencias = async (nombre, email) => {
    if (!nombre || !email) return;
    try {
      const res = await api.post('/auth/sugerir-username', { nombre, email });
      setSugerencias(res.data.sugerencias || []);
      if (res.data.sugerencias?.length > 0 && !formAdmin.username) {
        setFormAdmin(prev => ({ ...prev, username: res.data.sugerencias[0] }));
        verificarUsername(res.data.sugerencias[0]);
      }
    } catch {}
  };

  const verificarUsername = async (val) => {
    if (!val || val.length < 3) { setCheckUsername(null); return; }
    setCheckUsername('checking');
    try {
      const res = await api.get(`/auth/verificar-username/${val}`);
      setCheckUsername(res.data.disponible ? 'ok' : 'taken');
    } catch { setCheckUsername(null); }
  };

  const usernameTimeout = useRef(null);
  const handleUsernameChange = (val) => {
    const limpio = val.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    setFormAdmin(prev => ({ ...prev, username: limpio }));
    clearTimeout(usernameTimeout.current);
    usernameTimeout.current = setTimeout(() => verificarUsername(limpio), 500);
  };

  const handleSubmitAdmin = async (e) => {
    e.preventDefault();
    if (editandoAdmin) { await handleSubmitAdmin_edit(e); return; }
    if (formAdmin.password !== formAdmin.confirmar) return toast.error('Las contraseñas no coinciden');
    if (formAdmin.password.length < 6) return toast.error('Mínimo 6 caracteres');
    if (checkUsername === 'taken') return toast.error('Ese username ya está en uso');
    try {
      await api.post('/modulos/admins', {
        nombre: formAdmin.nombre, email: formAdmin.email,
        username: formAdmin.username, password: formAdmin.password,
        cliente_id: clienteSel?.id, clinica_nombre: clienteSel?.nombre
      });
      toast.success(`✅ Admin creado — Login: ${formAdmin.username}`);
      setModalAdmin(false);
      setEditandoAdmin(null);
      setFormAdmin({ nombre:'', email:'', username:'', password:'', confirmar:'' });
      setSugerencias([]);
      setCheckUsername(null);
      await refrescarClienteSel();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al crear admin'); }
  };

  // ── CONTRASEÑA ────────────────────────────────────────────────────────────────
  const cambiarPassword = async (e) => {
    e.preventDefault();
    if (pwForm.nuevo !== pwForm.confirmar) return toast.error('Las contraseñas no coinciden');
    if (pwForm.nuevo.length < 6) return toast.error('Mínimo 6 caracteres');
    try {
      await api.post('/modulos/master/cambiar-password', { password_actual: pwForm.actual, password_nuevo: pwForm.nuevo });
      toast.success('✅ Contraseña actualizada');
      setPwForm({ actual:'', nuevo:'', confirmar:'' });
    } catch (err) { toast.error(err.response?.data?.error || 'Error'); }
  };

  const puedeCrearAdmin = clienteSel && (clienteSel.admins?.length < (clienteSel.max_admins || 1));
  const activosCount = (admin) => (admin?.modulos||[]).filter(m=>m.activo).length;

  return (
    <div className="p-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🔧 Panel Máster</h1>
          <p className="text-gray-500">Gestión global de clientes, accesos y módulos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('clientes')}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition ${tab==='clientes'?'bg-blue-600 text-white':'bg-white text-gray-600 hover:bg-gray-50 shadow'}`}>
            🏢 Clientes
          </button>
          <button onClick={() => setTab('password')}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition ${tab==='password'?'bg-yellow-500 text-white':'bg-white text-gray-600 hover:bg-gray-50 shadow'}`}>
            🔑 Mi contraseña
          </button>
        </div>
      </div>

      {/* ══ TAB CLIENTES ══════════════════════════════════════════════════════ */}
      {tab === 'clientes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ─ Lista clientes ─────────────────────────────────────────── */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold text-gray-800">🏢 Clientes</h2>
                <button onClick={() => abrirModalCliente()}
                  className="bg-teal-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-teal-700 font-medium">
                  + Nuevo
                </button>
              </div>

              {/* Buscador */}
              <div className="relative mb-3">
                <input value={busqueda} onChange={e => handleBusqueda(e.target.value)}
                  placeholder="🔍 Buscar por nombre, NIT, email, ciudad..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"/>
                {busqueda && (
                  <button onClick={() => { setBusqueda(''); cargarClientes(''); }}
                    className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 text-sm">✕</button>
                )}
              </div>

              {cargando ? (
                <div className="text-center py-8 text-gray-400">⏳ Cargando...</div>
              ) : clientes.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-3xl mb-2">🔍</p>
                  <p className="text-sm">{busqueda ? 'Sin resultados' : 'No hay clientes aún'}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                  {clientes.map(c => (
                    <button key={c.id} onClick={() => seleccionarCliente(c)}
                      className={`w-full text-left rounded-xl p-3 border-2 transition ${
                        clienteSel?.id===c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-blue-200'
                      } ${!c.activo ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-3">
                        {c.logo_url
                          ? <img src={`http://localhost:5000${c.logo_url}`} alt="" className="w-10 h-10 rounded-lg object-contain border flex-shrink-0"/>
                          : <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">{c.nombre?.charAt(0)}</div>}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{c.nombre}</p>
                          {c.nit && <p className="text-xs text-gray-400">NIT: {c.nit}</p>}
                          {c.ciudad && <p className="text-xs text-gray-400">📍 {c.ciudad}{c.pais && c.pais !== 'Colombia' ? `, ${c.pais}` : ''}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.activo?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>
                              {c.activo?'Activo':'Inactivo'}
                            </span>
                            <span className="text-xs text-gray-400">{c.admins?.length||0}/{c.max_admins||1} admin</span>
                          </div>
                        </div>
                      </div>
                      {c.admins?.length>0 && (
                        <div className="mt-2 flex gap-1 flex-wrap">
                          {(c.modulos||[]).filter(m=>m.activo).map(m=>(
                            <span key={m.clave} className="text-xs bg-blue-50 text-blue-500 px-1 rounded">{m.icono}</span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─ Panel derecho ──────────────────────────────────────────── */}
          <div className="lg:col-span-8">
            {!clienteSel ? (
              <div className="bg-white rounded-2xl shadow p-12 text-center">
                <div className="text-6xl mb-4">👈</div>
                <p className="text-gray-500 font-medium">Selecciona un cliente para configurarlo</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Info cliente */}
                <div className="bg-white rounded-2xl shadow p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      {clienteSel.logo_url
                        ? <img src={`http://localhost:5000${clienteSel.logo_url}`} alt="" className="w-16 h-16 rounded-xl object-contain border"/>
                        : <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-400 to-teal-500 flex items-center justify-center text-white font-bold text-2xl">{clienteSel.nombre?.charAt(0)}</div>}
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">{clienteSel.nombre}</h2>
                        {clienteSel.nit          && <p className="text-sm text-gray-500">🪪 NIT: {clienteSel.nit}</p>}
                        {clienteSel.representante && <p className="text-sm text-gray-500">👤 {clienteSel.representante}</p>}
                        {clienteSel.telefono      && <p className="text-sm text-gray-500">📞 {clienteSel.telefono}</p>}
                        {clienteSel.email         && <p className="text-sm text-gray-500">✉️ {clienteSel.email}</p>}
                        {clienteSel.ciudad        && <p className="text-sm text-gray-500">📍 {clienteSel.ciudad}{clienteSel.pais ? `, ${clienteSel.pais}` : ''}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => abrirModalCliente(clienteSel)}
                        className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-200">✏️ Editar</button>
                      <button onClick={() => eliminarCliente(clienteSel)}
                        className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-sm hover:bg-red-200">🗑️ Eliminar</button>
                    </div>
                  </div>
                </div>

                {/* Admins */}
                <div className="bg-white rounded-2xl shadow p-5">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-bold text-gray-800">👤 Usuarios Administradores</h3>
                      <p className="text-xs text-gray-400">{clienteSel.admins?.length||0} de {clienteSel.max_admins||1} permitidos</p>
                    </div>
                    {puedeCrearAdmin && (
                      <button onClick={() => setModalAdmin(true)}
                        className="bg-blue-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-700 font-medium">
                        + Crear admin
                      </button>
                    )}
                    {!puedeCrearAdmin && clienteSel.admins?.length > 0 && (
                      <span className="text-xs text-orange-500 bg-orange-50 px-3 py-1.5 rounded-lg">
                        Límite alcanzado ({clienteSel.max_admins})
                      </span>
                    )}
                  </div>

                  {clienteSel.admins?.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-xl">
                      <p className="text-2xl mb-2">👤</p>
                      <p className="text-sm">Sin usuario admin asignado</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {clienteSel.admins.map(a => (
                        <div key={a.id}
                          onClick={() => cargarModulosAdmin(a)}
                          className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition ${
                            adminSel?.id===a.id ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-blue-200'
                          }`}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                              {a.nombre?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{a.nombre}</p>
                              <p className="text-xs text-gray-400">{a.email}</p>
                              {a.username && (
                                <p className="text-xs text-blue-500 font-mono">@{a.username}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${a.activo?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>
                                {a.activo?'Activo':'Inactivo'}
                              </span>
                              <p className="text-xs text-gray-400 mt-1">{activosCount(a)} módulos</p>
                            </div>
                            <div className="flex gap-1 ml-1">
                              <button onClick={e => { e.stopPropagation(); setModalVerAdmin(a); }}
                                className="bg-teal-100 text-teal-600 p-1.5 rounded-lg hover:bg-teal-200 text-xs"
                                title="Ver info">
                                👁️
                              </button>
                              <button onClick={e => { e.stopPropagation(); abrirEditarAdmin(a); }}
                                className="bg-yellow-100 text-yellow-600 p-1.5 rounded-lg hover:bg-yellow-200 text-xs"
                                title="Editar">
                                ✏️
                              </button>
                              {a.activo ? (
                                <button onClick={e => { e.stopPropagation(); eliminarAdmin(a); }}
                                  className="bg-orange-100 text-orange-500 p-1.5 rounded-lg hover:bg-orange-200 text-xs"
                                  title="Desactivar">
                                  🔕
                                </button>
                              ) : (
                                <button onClick={e => { e.stopPropagation(); reactivarAdmin(a); }}
                                  className="bg-green-100 text-green-600 p-1.5 rounded-lg hover:bg-green-200 text-xs"
                                  title="Reactivar">
                                  ✅
                                </button>
                              )}
                              <button onClick={e => { e.stopPropagation(); eliminarAdminDefinitivo(a); }}
                                className="bg-red-100 text-red-600 p-1.5 rounded-lg hover:bg-red-200 text-xs"
                                title="Eliminar definitivamente">
                                ❌
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Módulos */}
                {adminSel && (
                  <div className="bg-white rounded-2xl shadow p-5">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-bold text-gray-800">🔧 Módulos habilitados</h3>
                        <p className="text-xs text-gray-400">Para @{adminSel.username || adminSel.nombre}</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {MODULOS_DEF.filter(m => OBLIGATORIOS.includes(m.clave) || modulosState[m.clave]).length}
                        <span className="text-gray-300 text-base">/{MODULOS_DEF.length}</span>
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                      {MODULOS_DEF.map(m => {
                        const oblig = OBLIGATORIOS.includes(m.clave);
                        const activo = oblig || (modulosState[m.clave] ?? false);
                        return (
                          <div key={m.clave} onClick={() => toggleModulo(m.clave)}
                            className={`flex items-center justify-between p-3 rounded-xl border-2 transition ${
                              activo ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                            } ${oblig ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{m.icono}</span>
                              <div>
                                <p className={`text-sm font-semibold ${activo?'text-green-800':'text-gray-600'}`}>{m.nombre}</p>
                                <p className="text-xs text-gray-400">{m.desc}</p>
                                {oblig && <p className="text-xs text-blue-500">Obligatorio</p>}
                              </div>
                            </div>
                            <div className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${activo?'bg-green-500':'bg-gray-300'}`}>
                              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${activo?'translate-x-5':'translate-x-0.5'}`}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={guardarModulos} disabled={guardando}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                      {guardando ? '⏳ Guardando...' : '💾 Guardar módulos'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB CONTRASEÑA ════════════════════════════════════════════════════ */}
      {tab === 'password' && (
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🔑</div>
              <h2 className="text-xl font-bold">Cambiar contraseña Máster</h2>
            </div>
            <form onSubmit={cambiarPassword} className="space-y-4">
              {[['actual','Contraseña actual'],['nuevo','Nueva contraseña'],['confirmar','Confirmar nueva']].map(([k,l]) => (
                <div key={k}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{l}</label>
                  <input type="password" value={pwForm[k]} onChange={e => setPwForm({...pwForm,[k]:e.target.value})}
                    required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"/>
                </div>
              ))}
              <button type="submit" className="w-full py-3 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 font-semibold">
                🔑 Actualizar contraseña
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL CLIENTE ═════════════════════════════════════════════════════ */}
      {modalCliente && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold">{editandoCliente ? '✏️ Editar Cliente' : '🏢 Nuevo Cliente'}</h2>
            </div>
            <form onSubmit={handleSubmitCliente} className="p-5 space-y-4">
              {/* Logo */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer"
                  onClick={() => logoRef.current?.click()}>
                  {logoPreview ? <img src={logoPreview} alt="" className="w-full h-full object-contain"/>
                    : <div className="text-center text-gray-400"><div className="text-3xl">🖼️</div><p className="text-xs mt-1">Logo</p></div>}
                </div>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange}/>
                <button type="button" onClick={() => logoRef.current?.click()} className="text-xs text-blue-600 hover:underline">
                  {logoPreview ? 'Cambiar logo' : 'Subir logo (opcional)'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la clínica / fundación *</label>
                  <input value={formCliente.nombre} onChange={e => setFormCliente({...formCliente, nombre:e.target.value})}
                    required placeholder="Ej: Veterinaria Huellitas"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Representante / Encargado</label>
                  <input value={formCliente.representante} onChange={e => setFormCliente({...formCliente, representante:e.target.value})}
                    placeholder="Nombre del responsable"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
                    <input value={formCliente.nit} onChange={e => setFormCliente({...formCliente, nit:e.target.value})}
                      placeholder="Opcional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input value={formCliente.telefono} onChange={e => setFormCliente({...formCliente, telefono:e.target.value})}
                      placeholder="Opcional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formCliente.email} onChange={e => setFormCliente({...formCliente, email:e.target.value})}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                    <input value={formCliente.ciudad} onChange={e => setFormCliente({...formCliente, ciudad:e.target.value})}
                      placeholder="Ej: Bogotá"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                    <input value={formCliente.pais} onChange={e => setFormCliente({...formCliente, pais:e.target.value})}
                      placeholder="Colombia"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input value={formCliente.direccion} onChange={e => setFormCliente({...formCliente, direccion:e.target.value})}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Máximo de usuarios admin
                    <span className="text-gray-400 font-normal text-xs ml-1">(cuántos admins puede tener)</span>
                  </label>
                  <input type="number" min="1" max="10" value={formCliente.max_admins}
                    onChange={e => setFormCliente({...formCliente, max_admins: parseInt(e.target.value)||1})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalCliente(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  {editandoCliente ? 'Actualizar' : 'Crear cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL ADMIN ═══════════════════════════════════════════════════════ */}
      {modalAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold">{editandoAdmin ? '✏️ Editar Admin' : '👤 Crear usuario Admin'}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {editandoAdmin ? <span>Editando: <b>{editandoAdmin.nombre}</b></span> : <span>Para: <b>{clienteSel?.nombre}</b></span>}
              </p>
            </div>
            <form onSubmit={handleSubmitAdmin} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input value={formAdmin.nombre}
                  onChange={e => setFormAdmin(p => ({...p, nombre: e.target.value}))}
                  onBlur={() => pedirSugerencias(formAdmin.nombre, formAdmin.email)}
                  required placeholder="Nombre del administrador"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={formAdmin.email}
                  onChange={e => setFormAdmin(p => ({...p, email: e.target.value}))}
                  onBlur={() => pedirSugerencias(formAdmin.nombre, formAdmin.email)}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>

              {/* USERNAME */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de usuario (login) *
                  <span className="text-gray-400 font-normal text-xs ml-1">— con esto ingresará al sistema</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm">@</span>
                  <input value={formAdmin.username} onChange={e => handleUsernameChange(e.target.value)}
                    required placeholder="usuario.login"
                    className={`w-full pl-7 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm font-mono ${
                      checkUsername==='ok' ? 'border-green-400 focus:ring-green-300' :
                      checkUsername==='taken' ? 'border-red-400 focus:ring-red-300' :
                      'border-gray-300 focus:ring-blue-500'
                    }`}/>
                  <span className="absolute right-3 top-2.5 text-sm">
                    {checkUsername==='checking' && '⏳'}
                    {checkUsername==='ok'       && '✅'}
                    {checkUsername==='taken'    && '❌'}
                  </span>
                </div>
                {checkUsername==='ok'    && <p className="text-xs text-green-600 mt-1">✅ Disponible</p>}
                {checkUsername==='taken' && <p className="text-xs text-red-600 mt-1">❌ Ya está en uso</p>}

                {/* Sugerencias */}
                {sugerencias.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Sugerencias:</p>
                    <div className="flex gap-2 flex-wrap">
                      {sugerencias.map(s => (
                        <button key={s} type="button"
                          onClick={() => { setFormAdmin(p => ({...p, username: s})); verificarUsername(s); setSugerencias([]); }}
                          className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 font-mono">
                          @{s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña {editandoAdmin ? <span className="text-gray-400 font-normal text-xs">(dejar vacío para no cambiar)</span> : '*'}
                  </label>
                  <input type="password" value={formAdmin.password} onChange={e => setFormAdmin(p => ({...p, password:e.target.value}))}
                    required={!editandoAdmin} minLength={editandoAdmin ? 0 : 6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar {!editandoAdmin && '*'}</label>
                  <input type="password" value={formAdmin.confirmar} onChange={e => setFormAdmin(p => ({...p, confirmar:e.target.value}))}
                    required={!editandoAdmin}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              </div>

              {!editandoAdmin ? (
                <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                  💡 El cliente usará <b>@{formAdmin.username || 'su_usuario'}</b> + contraseña para entrar al sistema.
                  Recuerda activar los módulos antes de entregar las credenciales.
                </div>
              ) : (
                <div className="bg-yellow-50 rounded-lg p-3 text-xs text-yellow-700">
                  ✏️ Editando admin. La contraseña solo se actualizará si escribes una nueva.
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModalAdmin(false); setEditandoAdmin(null); setSugerencias([]); setCheckUsername(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={checkUsername==='taken' || checkUsername==='checking'}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                  {editandoAdmin ? 'Guardar cambios' : 'Crear admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL VER INFO ADMIN ════════════════════════════════════════════ */}
      {modalVerAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">👤 Información del Admin</h2>
              <button onClick={() => setModalVerAdmin(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                  {modalVerAdmin.nombre?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{modalVerAdmin.nombre}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${modalVerAdmin.activo?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>
                    {modalVerAdmin.activo ? '✅ Activo' : '❌ Inactivo'}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Usuario (login)</span>
                  <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded">@{modalVerAdmin.username || 'sin username'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Email</span>
                  <span className="text-sm text-gray-700">{modalVerAdmin.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Rol</span>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Admin</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Módulos activos</span>
                  <span className="text-sm font-bold text-gray-800">{activosCount(modalVerAdmin)}</span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700">
                🔑 <b>Credenciales de acceso:</b><br/>
                Usuario: <span className="font-mono">@{modalVerAdmin.username || modalVerAdmin.email}</span><br/>
                (Contraseña definida al crear el usuario)
              </div>

              <div className="flex gap-2 pt-1 flex-wrap">
                <button onClick={() => { setModalVerAdmin(null); abrirEditarAdmin(modalVerAdmin); }}
                  className="flex-1 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-medium text-sm">
                  ✏️ Editar
                </button>
                {modalVerAdmin.activo ? (
                  <button onClick={() => { setModalVerAdmin(null); eliminarAdmin(modalVerAdmin); }}
                    className="flex-1 py-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 font-medium text-sm">
                    🔕 Desactivar
                  </button>
                ) : (
                  <button onClick={() => { setModalVerAdmin(null); reactivarAdmin(modalVerAdmin); }}
                    className="flex-1 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium text-sm">
                    ✅ Reactivar
                  </button>
                )}
                <button onClick={() => { setModalVerAdmin(null); eliminarAdminDefinitivo(modalVerAdmin); }}
                  className="py-2 px-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm"
                  title="Eliminar definitivamente">
                  ❌ Eliminar
                </button>
                <button onClick={() => setModalVerAdmin(null)}
                  className="py-2 px-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium text-sm">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}