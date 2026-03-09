import { useState, useEffect } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

export default function Citas() {
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    paciente_id: '', fecha_cita: '', motivo: '', estado: 'pendiente', notas: ''
  });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [cit, pac] = await Promise.all([
        api.get('/citas'),
        api.get('/pacientes')
      ]);
      setCitas(cit.data);
      setPacientes(pac.data);
    } catch (err) {
      toast.error('Error al cargar citas');
    } finally {
      setCargando(false);
    }
  };

  const abrirModal = (c = null) => {
    if (c) {
      setEditando(c);
      setForm({
        paciente_id: c.paciente_id||'',
        fecha_cita: c.fecha_cita?.slice(0,16)||'',
        motivo: c.motivo||'',
        estado: c.estado||'pendiente',
        notas: c.notas||''
      });
    } else {
      setEditando(null);
      setForm({ paciente_id:'', fecha_cita:'', motivo:'', estado:'pendiente', notas:'' });
    }
    setModalAbierto(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await api.put(`/citas/${editando.id}`, form);
        toast.success('✅ Cita actualizada');
      } else {
        await api.post('/citas', form);
        toast.success('✅ Cita registrada');
      }
      setModalAbierto(false);
      cargarDatos();
    } catch (err) {
      toast.error('Error al guardar');
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta cita?')) return;
    try {
      await api.delete(`/citas/${id}`);
      toast.success('✅ Eliminada');
      cargarDatos();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const colorEstado = (estado) => {
    const colores = {
      pendiente: 'bg-yellow-100 text-yellow-700',
      confirmada: 'bg-blue-100 text-blue-700',
      completada: 'bg-green-100 text-green-700',
      cancelada: 'bg-red-100 text-red-700'
    };
    return colores[estado] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-6">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📅 Citas</h1>
          <p className="text-gray-500">Gestión de citas médicas</p>
        </div>
        <button onClick={() => abrirModal()}
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium transition">
          + Nueva Cita
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {cargando ? (
          <div className="p-8 text-center text-gray-500">⏳ Cargando...</div>
        ) : citas.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-6xl">📅</span>
            <p className="mt-3 text-gray-500">No hay citas registradas</p>
            <button onClick={() => abrirModal()}
              className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
              Agendar primera cita
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Paciente','Fecha','Motivo','Estado','Notas','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {citas.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.paciente_nombre||'-'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.fecha_cita ? new Date(c.fecha_cita).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.motivo||'-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorEstado(c.estado)}`}>
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{c.notas||'-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => abrirModal(c)}
                        className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-sm hover:bg-yellow-200">
                        ✏️ Editar
                      </button>
                      <button onClick={() => eliminar(c.id)}
                        className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm hover:bg-red-200">
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

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {editando ? '✏️ Editar Cita' : '📅 Nueva Cita'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
                <select value={form.paciente_id} onChange={e => setForm({...form, paciente_id: e.target.value})}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Seleccionar paciente</option>
                  {pacientes.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.especie})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y Hora *</label>
                <input type="datetime-local" value={form.fecha_cita}
                  onChange={e => setForm({...form, fecha_cita: e.target.value})}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
                <input value={form.motivo} onChange={e => setForm({...form, motivo: e.target.value})}
                  required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="pendiente">⏳ Pendiente</option>
                  <option value="confirmada">✅ Confirmada</option>
                  <option value="completada">🏁 Completada</option>
                  <option value="cancelada">❌ Cancelada</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})}
                  rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAbierto(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
                  {editando ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}