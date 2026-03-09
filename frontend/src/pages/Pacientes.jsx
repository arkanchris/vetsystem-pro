import { useState, useEffect } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

const TIPO_INGRESO = {
  con_dueno:   { label: 'Con dueño',    color: 'bg-green-100 text-green-700',   icono: '🏠' },
  comunitario: { label: 'Comunitario',  color: 'bg-yellow-100 text-yellow-700', icono: '🌍' },
  callejero:   { label: 'Callejero',    color: 'bg-orange-100 text-orange-700', icono: '🐕' },
  abandonado:  { label: 'Abandonado',   color: 'bg-red-100 text-red-700',       icono: '💔' },
};

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [propietarios, setPropietarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [pacienteEditando, setPacienteEditando] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [form, setForm] = useState({
    nombre: '', especie: '', raza: '', sexo: '',
    fecha_nacimiento: '', color: '', peso: '',
    propietario_id: '', tipo_ingreso: 'con_dueno'
  });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [pac, prop] = await Promise.all([
        api.get('/pacientes'),
        api.get('/propietarios')
      ]);
      setPacientes(pac.data);
      setPropietarios(prop.data);
    } catch (err) {
      toast.error('Error al cargar datos');
    } finally {
      setCargando(false);
    }
  };

  const abrirModal = (paciente = null) => {
    setFotoFile(null);
    if (paciente) {
      setPacienteEditando(paciente);
      setFotoPreview(paciente.foto_url ? `http://localhost:5000${paciente.foto_url}` : null);
      setForm({
        nombre: paciente.nombre || '',
        especie: paciente.especie || '',
        raza: paciente.raza || '',
        sexo: paciente.sexo || '',
        fecha_nacimiento: paciente.fecha_nacimiento?.split('T')[0] || '',
        color: paciente.color || '',
        peso: paciente.peso || '',
        propietario_id: paciente.propietario_id || '',
        tipo_ingreso: paciente.tipo_ingreso || 'con_dueno'
      });
    } else {
      setPacienteEditando(null);
      setFotoPreview(null);
      setForm({ nombre: '', especie: '', raza: '', sexo: '',
        fecha_nacimiento: '', color: '', peso: '', propietario_id: '', tipo_ingreso: 'con_dueno' });
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setPacienteEditando(null);
    setFotoFile(null);
    setFotoPreview(null);
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const sinPropietario = ['callejero', 'comunitario', 'abandonado'].includes(form.tipo_ingreso);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (fotoFile) formData.append('foto', fotoFile);

      if (pacienteEditando) {
        await api.put(`/pacientes/${pacienteEditando.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('✅ Paciente actualizado');
      } else {
        await api.post('/pacientes', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('✅ Paciente registrado');
      }
      cerrarModal();
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
    const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.especie.toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = filtroTipo === '' || p.tipo_ingreso === filtroTipo;
    return matchBusqueda && matchTipo;
  });

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

      {/* Buscador + filtros */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 space-y-3">
        <input type="text" placeholder="🔍 Buscar por nombre o especie..."
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFiltroTipo('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              filtroTipo === '' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>Todos</button>
          {Object.entries(TIPO_INGRESO).map(([val, info]) => (
            <button key={val} onClick={() => setFiltroTipo(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                filtroTipo === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}>
              {info.icono} {info.label}
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
                {['Foto', 'Nombre', 'Especie', 'Raza', 'Sexo', 'Tipo', 'Propietario', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pacientesFiltrados.map(p => {
                const tipo = TIPO_INGRESO[p.tipo_ingreso] || TIPO_INGRESO.con_dueno;
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      {p.foto_url ? (
                        <img src={`http://localhost:5000${p.foto_url}`} alt={p.nombre}
                          className="w-10 h-10 rounded-full object-cover border-2 border-blue-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl">🐾</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{p.nombre}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">{p.especie}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.raza || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.sexo || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${tipo.color}`}>
                        {tipo.icono} {tipo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {p.propietario_nombre
                        ? `${p.propietario_nombre} ${p.propietario_apellido}`
                        : <span className="text-gray-400 italic">Sin propietario</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => abrirModal(p)}
                          className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-sm hover:bg-yellow-200 transition">
                          ✏️ Editar
                        </button>
                        <button onClick={() => eliminar(p.id)}
                          className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm hover:bg-red-200 transition">
                          🗑️ Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {pacienteEditando ? '✏️ Editar Paciente' : '🐾 Nuevo Paciente'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              {/* Foto */}
              <div className="flex flex-col items-center gap-3">
                {fotoPreview ? (
                  <img src={fotoPreview} alt="preview"
                    className="w-24 h-24 rounded-full object-cover border-4 border-blue-300" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-4xl border-4 border-blue-200">🐾</div>
                )}
                <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm px-4 py-2 rounded-lg border border-blue-200 transition">
                  📷 {fotoPreview ? 'Cambiar foto' : 'Subir foto'}
                  <input type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
                </label>
                {fotoPreview && (
                  <button type="button" onClick={() => { setFotoFile(null); setFotoPreview(null); }}
                    className="text-xs text-red-500 hover:text-red-700">Quitar foto</button>
                )}
              </div>

              {/* Tipo de ingreso */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Ingreso *</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TIPO_INGRESO).map(([val, info]) => (
                    <button key={val} type="button"
                      onClick={() => setForm({...form, tipo_ingreso: val, propietario_id: ''})}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                        form.tipo_ingreso === val
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                      <span className="text-lg">{info.icono}</span>
                      {info.label}
                    </button>
                  ))}
                </div>
                {sinPropietario && (
                  <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
                    ⚠️ Sin propietario. Podrás vincularlo a un hogar de paso desde el módulo <b>Adopciones</b>.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Especie *</label>
                  <select value={form.especie} onChange={e => setForm({...form, especie: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    <option value="">Seleccionar</option>
                    <option value="Perro">🐶 Perro</option>
                    <option value="Gato">🐱 Gato</option>
                    <option value="Ave">🦜 Ave</option>
                    <option value="Conejo">🐰 Conejo</option>
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
                    <option value="">Seleccionar</option>
                    <option value="Macho">Macho</option>
                    <option value="Hembra">Hembra</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Nacimiento</label>
                  <input type="date" value={form.fecha_nacimiento} onChange={e => setForm({...form, fecha_nacimiento: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                  <input type="number" step="0.01" value={form.peso} onChange={e => setForm({...form, peso: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className={sinPropietario ? 'col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input value={form.color} onChange={e => setForm({...form, color: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {!sinPropietario && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Propietario</label>
                    <select value={form.propietario_id} onChange={e => setForm({...form, propietario_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Sin propietario</option>
                      {propietarios.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrarModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                  {pacienteEditando ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}