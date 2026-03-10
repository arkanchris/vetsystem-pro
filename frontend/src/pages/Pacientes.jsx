import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

const ADOPCION_BADGE = {
  disponible:    { label: '🐾 Disponible',   color: 'bg-green-100 text-green-700' },
  en_hogar:      { label: '🏠 En hogar',      color: 'bg-blue-100 text-blue-700' },
  en_tratamiento:{ label: '💊 Tratamiento',   color: 'bg-orange-100 text-orange-700' },
  adoptado:      { label: '❤️ Adoptado',      color: 'bg-purple-100 text-purple-700' },
};

const TIPOS_INGRESO = [
  { value: 'con_tutor',   label: 'Con Tutor',   icono: '🏠' },
  { value: 'comunitario', label: 'Comunitario',  icono: '🌍' },
  { value: 'callejero',   label: 'Callejero',    icono: '🐕' },
  { value: 'abandonado',  label: 'Abandonado',   icono: '💔' },
];

const TIPO_COLOR = {
  con_tutor:   'bg-blue-100 text-blue-700',
  comunitario: 'bg-green-100 text-green-700',
  callejero:   'bg-orange-100 text-orange-700',
  abandonado:  'bg-red-100 text-red-700',
};

// Modos de fecha de nacimiento
const MODOS_FECHA = [
  { value: 'exacta',      label: 'Fecha exacta' },
  { value: 'aproximada',  label: 'Año y mes aprox.' },
  { value: 'desconocida', label: 'Se desconoce' },
];

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [tutores, setTutores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [pacienteEditando, setPacienteEditando] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [archivoFoto, setArchivoFoto] = useState(null);
  const [modoFecha, setModoFecha] = useState('exacta');
  const [hojaVida, setHojaVida] = useState(null);
  const [cargandoHoja, setCargandoHoja] = useState(false);
  const fileInputRef = useRef(null);

  const verHojaVida = async (id) => {
    setCargandoHoja(true);
    setHojaVida({ cargando: true });
    try {
      const res = await api.get(`/pacientes/${id}/hoja-vida`);
      setHojaVida(res.data);
    } catch {
      toast.error('Error al cargar hoja de vida');
      setHojaVida(null);
    } finally { setCargandoHoja(false); }
  };

  const [form, setForm] = useState({
    nombre: '', especie: '', raza: '', sexo: '',
    fecha_nacimiento: '', fecha_nac_texto: '',
    color: '', peso: '', propietario_id: '',
    tipo_ingreso: 'con_tutor'
  });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [pac, prop] = await Promise.all([
        api.get('/pacientes'),
        api.get('/propietarios')
      ]);
      setPacientes(pac.data);
      setTutores(prop.data);
    } catch (err) {
      toast.error('Error al cargar datos');
    } finally {
      setCargando(false);
    }
  };

  const sinTutor = (tipo) => ['comunitario', 'callejero', 'abandonado'].includes(tipo);

  const abrirModal = (paciente = null) => {
    setFotoPreview(null);
    setArchivoFoto(null);
    if (paciente) {
      setPacienteEditando(paciente);
      // Detectar modo de fecha
      let modo = 'exacta';
      if (paciente.fecha_nac_texto === 'desconocida') modo = 'desconocida';
      else if (paciente.fecha_nac_texto && paciente.fecha_nac_texto !== '') modo = 'aproximada';
      setModoFecha(modo);
      setForm({
        nombre: paciente.nombre || '',
        especie: paciente.especie || '',
        raza: paciente.raza || '',
        sexo: paciente.sexo || '',
        fecha_nacimiento: paciente.fecha_nacimiento?.split('T')[0] || '',
        fecha_nac_texto: paciente.fecha_nac_texto || '',
        color: paciente.color || '',
        peso: paciente.peso || '',
        propietario_id: paciente.propietario_id || '',
        tipo_ingreso: paciente.tipo_ingreso || 'con_tutor'
      });
      if (paciente.foto_url) setFotoPreview(`http://localhost:5000${paciente.foto_url}`);
    } else {
      setPacienteEditando(null);
      setModoFecha('exacta');
      setForm({
        nombre: '', especie: '', raza: '', sexo: '',
        fecha_nacimiento: '', fecha_nac_texto: '',
        color: '', peso: '', propietario_id: '',
        tipo_ingreso: 'con_tutor'
      });
    }
    setModalAbierto(true);
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setArchivoFoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setFotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'fecha_nacimiento' && modoFecha !== 'exacta') return;
        if (k === 'fecha_nac_texto') {
          if (modoFecha === 'desconocida') fd.append(k, 'desconocida');
          else if (modoFecha === 'aproximada') fd.append(k, v);
          return;
        }
        if (sinTutor(form.tipo_ingreso) && k === 'propietario_id') return;
        fd.append(k, v);
      });
      if (archivoFoto) fd.append('foto', archivoFoto);

      if (pacienteEditando) {
        await api.put(`/pacientes/${pacienteEditando.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('✅ Paciente actualizado');
      } else {
        await api.post('/pacientes', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('✅ Paciente registrado');
      }
      setModalAbierto(false);
      cargarDatos();
    } catch (err) {
      toast.error('Error al guardar paciente');
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este paciente?')) return;
    try {
      await api.delete(`/pacientes/${id}`);
      toast.success('✅ Paciente eliminado');
      cargarDatos();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const pacientesFiltrados = pacientes.filter(p => {
    const match = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.especie.toLowerCase().includes(busqueda.toLowerCase());
    const tipo = filtroTipo ? p.tipo_ingreso === filtroTipo : true;
    return match && tipo;
  });

  const formatFechaNac = (p) => {
    if (p.fecha_nac_texto === 'desconocida') return '❓ Desconocida';
    if (p.fecha_nac_texto) return `~${p.fecha_nac_texto}`;
    if (p.fecha_nacimiento) return new Date(p.fecha_nacimiento).toLocaleDateString('es-CO');
    return '-';
  };

  return (
    <div className="p-6">
      <Toaster position="top-right" />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🐾 Pacientes</h1>
          <p className="text-gray-500">Gestión de mascotas registradas</p>
        </div>
        <button onClick={() => abrirModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition">
          + Nuevo Paciente
        </button>
      </div>

      {/* Buscador y filtros */}
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <input type="text" placeholder="🔍 Buscar por nombre o especie..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3" />
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFiltroTipo('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${!filtroTipo ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            Todos
          </button>
          {TIPOS_INGRESO.map(t => (
            <button key={t.value} onClick={() => setFiltroTipo(filtroTipo === t.value ? '' : t.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${filtroTipo === t.value ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              {t.icono} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {cargando ? (
          <div className="p-8 text-center text-gray-500">⏳ Cargando pacientes...</div>
        ) : pacientesFiltrados.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-6xl">🐾</span>
            <p className="mt-3 text-gray-500">No hay pacientes registrados</p>
            <button onClick={() => abrirModal()}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Registrar primer paciente
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Foto','Nombre','Especie','Raza','Sexo','Tipo','Tutor','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pacientesFiltrados.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    {p.foto_url ? (
                      <img src={`http://localhost:5000${p.foto_url}`} alt={p.nombre}
                        className="w-10 h-10 rounded-full object-cover border-2 border-blue-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">🐾</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.nombre}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">{p.especie}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.raza || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.sexo || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${TIPO_COLOR[p.tipo_ingreso] || 'bg-gray-100 text-gray-600'}`}>
                      {TIPOS_INGRESO.find(t => t.value === p.tipo_ingreso)?.icono} {TIPOS_INGRESO.find(t => t.value === p.tipo_ingreso)?.label || p.tipo_ingreso}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">
                    {p.propietario_nombre ? `${p.propietario_nombre} ${p.propietario_apellido || ''}` : (
                      <span className="text-gray-400 italic">Sin tutor</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => verHojaVida(p.id)}
                        className="bg-teal-100 text-teal-700 px-3 py-1 rounded-lg text-sm hover:bg-teal-200 transition"
                        title="Ver hoja de vida">
                        👁️
                      </button>
                      <button onClick={() => abrirModal(p)}
                        className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-sm hover:bg-yellow-200 transition">
                        ✏️ Editar
                      </button>
                      <button onClick={() => eliminar(p.id)}
                        className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm hover:bg-red-200 transition">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {pacienteEditando ? '✏️ Editar Paciente' : '🐾 Nuevo Paciente'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">

              {/* Foto */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-200 bg-blue-50 flex items-center justify-center">
                  {fotoPreview
                    ? <img src={fotoPreview} alt="preview" className="w-full h-full object-cover" />
                    : <span className="text-4xl">🐾</span>}
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="text-sm bg-blue-50 text-blue-600 px-4 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100">
                  📷 {fotoPreview ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {fotoPreview && (
                  <button type="button" onClick={() => { setFotoPreview(null); setArchivoFoto(null); }}
                    className="text-xs text-red-400 hover:text-red-600">Quitar foto</button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
              </div>

              {/* Tipo de Ingreso */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Ingreso *</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS_INGRESO.map(t => (
                    <button key={t.value} type="button"
                      onClick={() => setForm({...form, tipo_ingreso: t.value, propietario_id: sinTutor(t.value) ? '' : form.propietario_id})}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition ${
                        form.tipo_ingreso === t.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      <span className="text-lg">{t.icono}</span> {t.label}
                    </button>
                  ))}
                </div>
                {sinTutor(form.tipo_ingreso) && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700">
                      ⚠️ Sin tutor. Podrás vincularlo a un hogar de paso desde el módulo <span className="font-bold text-amber-800">Adopciones</span>.
                    </p>
                  </div>
                )}
              </div>

              {/* Nombre y Especie */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                    required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Especie *</label>
                  <select value={form.especie} onChange={e => setForm({...form, especie: e.target.value})}
                    required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Seleccionar</option>
                    <option value="Perro">🐶 Perro</option>
                    <option value="Gato">🐱 Gato</option>
                    <option value="Ave">🦜 Ave</option>
                    <option value="Conejo">🐰 Conejo</option>
                    <option value="Reptil">🦎 Reptil</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raza</label>
                  <input value={form.raza} onChange={e => setForm({...form, raza: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                  <select value={form.sexo} onChange={e => setForm({...form, sexo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">No especificado</option>
                    <option value="Macho">Macho</option>
                    <option value="Hembra">Hembra</option>
                  </select>
                </div>
              </div>

              {/* Fecha de Nacimiento — flexible */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Nacimiento</label>
                <div className="flex gap-2 mb-2">
                  {MODOS_FECHA.map(m => (
                    <button key={m.value} type="button"
                      onClick={() => setModoFecha(m.value)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition ${
                        modoFecha === m.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {m.label}
                    </button>
                  ))}
                </div>
                {modoFecha === 'exacta' && (
                  <input type="date" value={form.fecha_nacimiento}
                    onChange={e => setForm({...form, fecha_nacimiento: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                )}
                {modoFecha === 'aproximada' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Año aprox.</label>
                      <select onChange={e => {
                        const partes = form.fecha_nac_texto.split('/');
                        const mes = partes[0] || '';
                        setForm({...form, fecha_nac_texto: `${mes}/${e.target.value}`});
                      }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                        <option value="">Año</option>
                        {Array.from({length: 25}, (_, i) => new Date().getFullYear() - i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Mes aprox.</label>
                      <select onChange={e => {
                        const partes = form.fecha_nac_texto.split('/');
                        const anio = partes[1] || '';
                        setForm({...form, fecha_nac_texto: `${e.target.value}/${anio}`});
                      }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                        <option value="">Mes</option>
                        {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                          <option key={i} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                {modoFecha === 'desconocida' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                    <span className="text-gray-500 text-sm">❓ Fecha de nacimiento desconocida</span>
                  </div>
                )}
              </div>

              {/* Peso y Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                  <input type="number" step="0.01" value={form.peso}
                    onChange={e => setForm({...form, peso: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input value={form.color} onChange={e => setForm({...form, color: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Tutor — solo si tiene tutor */}
              {!sinTutor(form.tipo_ingreso) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tutor</label>
                  <select value={form.propietario_id} onChange={e => setForm({...form, propietario_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Sin tutor asignado</option>
                    {tutores.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre} {t.apellido}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAbierto(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  {pacienteEditando ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL HOJA DE VIDA ══════════════════════════════════════════ */}
      {hojaVida && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-[60] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
            {hojaVida.cargando ? (
              <div className="p-16 text-center text-gray-500">⏳ Cargando expediente...</div>
            ) : (
              <>
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-t-2xl p-6 text-white">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      {hojaVida.paciente?.foto_url
                        ? <img src={`http://localhost:5000${hojaVida.paciente.foto_url}`} alt=""
                            className="w-20 h-20 rounded-full object-cover border-3 border-white/50"/>
                        : <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl">🐾</div>}
                      <div>
                        <h2 className="text-2xl font-bold">{hojaVida.paciente?.nombre}</h2>
                        <p className="text-teal-100">{hojaVida.paciente?.especie} · {hojaVida.paciente?.raza||'Sin raza'} · {hojaVida.paciente?.sexo||'-'}</p>
                        <p className="text-teal-100 text-sm">Color: {hojaVida.paciente?.color||'-'} · Peso: {hojaVida.paciente?.peso||'-'} kg</p>
                        {hojaVida.adopcion && ADOPCION_BADGE[hojaVida.adopcion.estado] && (
                          <span className="mt-1 inline-block text-xs bg-white/20 text-white px-3 py-0.5 rounded-full">
                            {ADOPCION_BADGE[hojaVida.adopcion.estado].label}
                            {hojaVida.adopcion.hogar_nombre && ` · ${hojaVida.adopcion.hogar_nombre}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setHojaVida(null)} className="text-white/70 hover:text-white text-3xl leading-none">×</button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Datos tutor */}
                  {hojaVida.paciente?.propietario_nombre && (
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h3 className="font-semibold text-blue-800 mb-2">👤 Tutor</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><span className="text-gray-500">Nombre:</span> <b>{hojaVida.paciente.propietario_nombre} {hojaVida.paciente.propietario_apellido||''}</b></p>
                        {hojaVida.paciente.propietario_telefono && <p><span className="text-gray-500">Teléfono:</span> {hojaVida.paciente.propietario_telefono}</p>}
                        {hojaVida.paciente.propietario_email && <p><span className="text-gray-500">Email:</span> {hojaVida.paciente.propietario_email}</p>}
                      </div>
                    </div>
                  )}

                  {/* Vacunas resumen */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      💉 Vacunas
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        hojaVida.vacunas?.length === 0 ? 'bg-gray-100 text-gray-500' :
                        hojaVida.vacunas?.some(v => v.fecha_proxima && new Date(v.fecha_proxima) < new Date())
                          ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {hojaVida.vacunas?.length || 0} registradas
                      </span>
                    </h3>
                    {hojaVida.vacunas?.length === 0 ? (
                      <p className="text-gray-400 text-sm italic">Sin vacunas registradas</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {hojaVida.vacunas.map(v => {
                          const hoy = new Date();
                          const prox = v.fecha_proxima ? new Date(v.fecha_proxima) : null;
                          const vencida = prox && prox < hoy;
                          return (
                            <div key={v.id} className={`rounded-lg p-3 border text-sm ${vencida ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                              <p className="font-semibold text-gray-800">💉 {v.nombre}</p>
                              {v.fecha_aplicacion && <p className="text-gray-500 text-xs">Aplicada: {new Date(v.fecha_aplicacion).toLocaleDateString('es-CO')}</p>}
                              {prox && <p className={`text-xs font-medium ${vencida ? 'text-red-600' : 'text-green-600'}`}>
                                Próxima: {prox.toLocaleDateString('es-CO')} {vencida ? '⚠️' : '✅'}
                              </p>}
                              {v.documentos?.length > 0 && (
                                <div className="mt-1 flex gap-1 flex-wrap">
                                  {v.documentos.map(d => (
                                    <a key={d.id} href={`http://localhost:5000${d.archivo_url}`} target="_blank" rel="noreferrer"
                                      className="text-xs text-indigo-600 underline">📎 {d.nombre}</a>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Historias clínicas */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">📋 Historias Clínicas ({hojaVida.historias?.length || 0})</h3>
                    {hojaVida.historias?.length === 0 ? (
                      <p className="text-gray-400 text-sm italic">Sin historias registradas</p>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {hojaVida.historias.map(h => (
                          <div key={h.id} className="bg-gray-50 rounded-lg p-3 border text-sm">
                            <div className="flex justify-between items-start mb-1">
                              <p className="font-semibold text-teal-700">🩺 {h.motivo_consulta}</p>
                              <p className="text-gray-400 text-xs">{new Date(h.fecha).toLocaleDateString('es-CO')}</p>
                            </div>
                            {h.diagnostico && <p className="text-gray-600 text-xs"><span className="font-medium">Dx:</span> {h.diagnostico}</p>}
                            {h.tratamiento  && <p className="text-gray-600 text-xs"><span className="font-medium">Tx:</span> {h.tratamiento}</p>}
                            {(h.peso_consulta || h.temperatura) && (
                              <p className="text-gray-500 text-xs mt-1">
                                {h.peso_consulta && `⚖️ ${h.peso_consulta}kg`} {h.temperatura && `🌡️ ${h.temperatura}°C`}
                              </p>
                            )}
                            {h.documentos?.length > 0 && (
                              <div className="mt-1 flex gap-1 flex-wrap">
                                {h.documentos.map(d => (
                                  <a key={d.id} href={`http://localhost:5000${d.archivo_url}`} target="_blank" rel="noreferrer"
                                    className="text-xs text-indigo-600 underline">📎 {d.nombre}</a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Citas recientes */}
                  {hojaVida.citas?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-3">📅 Citas Recientes</h3>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {hojaVida.citas.map(c => (
                          <div key={c.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 text-sm border">
                            <span className="text-gray-700">{c.motivo}</span>
                            <span className="text-gray-400 text-xs">{new Date(c.fecha_cita).toLocaleDateString('es-CO')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t flex justify-end">
                  <button onClick={() => setHojaVida(null)}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}