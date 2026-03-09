import { useState, useEffect } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

export default function Propietarios() {
  const [propietarios, setPropietarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    nombre: '', apellido: '', telefono: '',
    email: '', direccion: '', documento: ''
  });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const res = await api.get('/propietarios');
      setPropietarios(res.data);
    } catch (err) {
      toast.error('Error al cargar propietarios');
    } finally {
      setCargando(false);
    }
  };

  const abrirModal = (p = null) => {
    if (p) {
      setEditando(p);
      setForm({ nombre: p.nombre||'', apellido: p.apellido||'',
        telefono: p.telefono||'', email: p.email||'',
        direccion: p.direccion||'', documento: p.documento||'' });
    } else {
      setEditando(null);
      setForm({ nombre:'', apellido:'', telefono:'', email:'', direccion:'', documento:'' });
    }
    setModalAbierto(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await api.put(`/propietarios/${editando.id}`, form);
        toast.success('✅ Propietario actualizado');
      } else {
        await api.post('/propietarios', form);
        toast.success('✅ Propietario registrado');
      }
      setModalAbierto(false);
      cargarDatos();
    } catch (err) {
      toast.error('Error al guardar');
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este propietario?')) return;
    try {
      await api.delete(`/propietarios/${id}`);
      toast.success('✅ Eliminado');
      cargarDatos();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const filtrados = propietarios.filter(p =>
    `${p.nombre} ${p.apellido}`.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.documento||'').includes(busqueda)
  );

  return (
    <div className="p-6">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">👨‍👩‍👧 Propietarios</h1>
          <p className="text-gray-500">Gestión de dueños de mascotas</p>
        </div>
        <button onClick={() => abrirModal()}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium transition">
          + Nuevo Propietario
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <input type="text" placeholder="🔍 Buscar por nombre o documento..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {cargando ? (
          <div className="p-8 text-center text-gray-500">⏳ Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-6xl">👨‍👩‍👧</span>
            <p className="mt-3 text-gray-500">No hay propietarios registrados</p>
            <button onClick={() => abrirModal()}
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Registrar primer propietario
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Nombre','Documento','Teléfono','Email','Dirección','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.nombre} {p.apellido}</td>
                  <td className="px-4 py-3 text-gray-600">{p.documento||'-'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.telefono||'-'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.email||'-'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.direccion||'-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => abrirModal(p)}
                        className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-sm hover:bg-yellow-200">
                        ✏️ Editar
                      </button>
                      <button onClick={() => eliminar(p.id)}
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
                {editando ? '✏️ Editar Propietario' : '👨‍👩‍👧 Nuevo Propietario'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[['nombre','Nombre *',true],['apellido','Apellido *',true],
                  ['documento','Documento',false],['telefono','Teléfono',false],
                  ['email','Email',false],['direccion','Dirección',false]].map(([field, label, req]) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input value={form[field]} onChange={e => setForm({...form, [field]: e.target.value})}
                      required={req}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAbierto(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
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