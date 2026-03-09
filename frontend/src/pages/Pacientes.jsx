import { useState, useEffect } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [propietarios, setPropietarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [pacienteEditando, setPacienteEditando] = useState(null);
  const [form, setForm] = useState({
    nombre: '', especie: '', raza: '', sexo: '',
    fecha_nacimiento: '', color: '', peso: '', propietario_id: ''
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
    if (paciente) {
      setPacienteEditando(paciente);
      setForm({
        nombre: paciente.nombre || '',
        especie: paciente.especie || '',
        raza: paciente.raza || '',
        sexo: paciente.sexo || '',
        fecha_nacimiento: paciente.fecha_nacimiento?.split('T')[0] || '',
        color: paciente.color || '',
        peso: paciente.peso || '',
        propietario_id: paciente.propietario_id || ''
      });
    } else {
      setPacienteEditando(null);
      setForm({ nombre: '', especie: '', raza: '', sexo: '',
        fecha_nacimiento: '', color: '', peso: '', propietario_id: '' });
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => { setModalAbierto(false); setPacienteEditando(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (pacienteEditando) {
        await api.put(`/pacientes/${pacienteEditando.id}`, form);
        toast.success('✅ Paciente actualizado');
      } else {
        await api.post('/pacientes', form);
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

  const pacientesFiltrados = pacientes.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.especie.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-6">
      <Toaster position="top-right" />

      {/* Encabezado */}
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

      {/* Buscador */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o especie..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
                {['Nombre','Especie','Raza','Sexo','Peso','Propietario','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pacientesFiltrados.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.nombre}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                      {p.especie}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.raza || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.sexo || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.peso ? `${p.peso} kg` : '-'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.propietario_nombre ? `${p.propietario_nombre} ${p.propietario_apellido}` : '-'}
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
              ))}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Especie *</label>
                  <select value={form.especie} onChange={e => setForm({...form, especie: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input value={form.color} onChange={e => setForm({...form, color: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
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