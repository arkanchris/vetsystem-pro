import { useState, useEffect } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

export default function Medicamentos() {
  const [medicamentos, setMedicamentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    nombre: '', descripcion: '', categoria: '',
    unidad: '', stock: '', stock_minimo: '',
    precio: '', fecha_vencimiento: ''
  });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const res = await api.get('/medicamentos');
      setMedicamentos(res.data);
    } catch (err) {
      toast.error('Error al cargar medicamentos');
    } finally {
      setCargando(false);
    }
  };

  const abrirModal = (m = null) => {
    if (m) {
      setEditando(m);
      setForm({
        nombre: m.nombre||'', descripcion: m.descripcion||'',
        categoria: m.categoria||'', unidad: m.unidad||'',
        stock: m.stock||'', stock_minimo: m.stock_minimo||'',
        precio: m.precio||'', fecha_vencimiento: m.fecha_vencimiento?.split('T')[0]||''
      });
    } else {
      setEditando(null);
      setForm({ nombre:'', descripcion:'', categoria:'', unidad:'', stock:'', stock_minimo:'', precio:'', fecha_vencimiento:'' });
    }
    setModalAbierto(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await api.put(`/medicamentos/${editando.id}`, form);
        toast.success('✅ Medicamento actualizado');
      } else {
        await api.post('/medicamentos', form);
        toast.success('✅ Medicamento registrado');
      }
      setModalAbierto(false);
      cargarDatos();
    } catch (err) {
      toast.error('Error al guardar');
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este medicamento?')) return;
    try {
      await api.delete(`/medicamentos/${id}`);
      toast.success('✅ Eliminado');
      cargarDatos();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const filtrados = medicamentos.filter(m =>
    m.nombre.toLowerCase().includes((busqueda||'').toLowerCase())
  );

  return (
    <div className="p-6">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">💊 Medicamentos</h1>
          <p className="text-gray-500">Inventario de medicamentos</p>
        </div>
        <button onClick={() => abrirModal()}
          className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-medium transition">
          + Nuevo Medicamento
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <input type="text" placeholder="🔍 Buscar medicamento..."
          value={busqueda||''} onChange={e => setBusqueda(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {cargando ? (
          <div className="p-8 text-center text-gray-500">⏳ Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-6xl">💊</span>
            <p className="mt-3 text-gray-500">No hay medicamentos registrados</p>
            <button onClick={() => abrirModal()}
              className="mt-4 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">
              Agregar primer medicamento
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Nombre','Categoría','Stock','Stock Mín.','Precio','Vencimiento','Estado','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-800">{m.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{m.categoria||'-'}</td>
                  <td className="px-4 py-3 font-bold text-gray-800">{m.stock} {m.unidad}</td>
                  <td className="px-4 py-3 text-gray-600">{m.stock_minimo}</td>
                  <td className="px-4 py-3 text-gray-600">${m.precio||'0'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {m.fecha_vencimiento ? new Date(m.fecha_vencimiento).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {m.stock <= m.stock_minimo ? (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">⚠️ Stock bajo</span>
                    ) : (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">✅ OK</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => abrirModal(m)}
                        className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-sm hover:bg-yellow-200">
                        ✏️ Editar
                      </button>
                      <button onClick={() => eliminar(m.id)}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {editando ? '✏️ Editar Medicamento' : '💊 Nuevo Medicamento'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                    required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})}
                    rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <input value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                  <input value={form.unidad} onChange={e => setForm({...form, unidad: e.target.value})}
                    placeholder="ml, mg, tabletas..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                  <input type="number" value={form.stock_minimo} onChange={e => setForm({...form, stock_minimo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                  <input type="number" step="0.01" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Vencimiento</label>
                  <input type="date" value={form.fecha_vencimiento} onChange={e => setForm({...form, fecha_vencimiento: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAbierto(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium">
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