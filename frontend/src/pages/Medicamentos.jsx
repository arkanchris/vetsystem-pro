import { useState, useEffect } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

export default function Medicamentos() {
  const [medicamentos, setMedicamentos] = useState([]);
  const [cargando, setCargando]         = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [busqueda, setBusqueda]         = useState('');
  const [editando, setEditando]         = useState(null);
  const [form, setForm] = useState({
    nombre:'', descripcion:'', categoria:'', unidad:'',
    stock:'', stock_minimo:'', precio_compra:'', precio_venta:'',
    fecha_vencimiento:''
  });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const res = await api.get('/medicamentos');
      setMedicamentos(res.data);
    } catch { toast.error('Error al cargar medicamentos'); }
    finally { setCargando(false); }
  };

  const abrirModal = (m = null) => {
    if (m) {
      setEditando(m);
      setForm({
        nombre: m.nombre||'', descripcion: m.descripcion||'',
        categoria: m.categoria||'', unidad: m.unidad||'',
        stock: m.stock||'', stock_minimo: m.stock_minimo||'',
        precio_compra: m.precio_compra||'',
        precio_venta: m.precio_venta || m.precio ||'',
        fecha_vencimiento: m.fecha_vencimiento?.split('T')[0]||''
      });
    } else {
      setEditando(null);
      setForm({ nombre:'', descripcion:'', categoria:'', unidad:'', stock:'', stock_minimo:'', precio_compra:'', precio_venta:'', fecha_vencimiento:'' });
    }
    setModalAbierto(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const datos = { ...form, precio: form.precio_venta };
      if (editando) {
        await api.put(`/medicamentos/${editando.id}`, datos);
        toast.success('✅ Medicamento actualizado');
      } else {
        await api.post('/medicamentos', datos);
        toast.success('✅ Medicamento registrado');
      }
      setModalAbierto(false);
      cargarDatos();
    } catch { toast.error('Error al guardar'); }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este medicamento?')) return;
    try {
      await api.delete(`/medicamentos/${id}`);
      toast.success('✅ Eliminado');
      cargarDatos();
    } catch { toast.error('Error'); }
  };

  const margen = (compra, venta) => {
    const c = parseFloat(compra) || 0;
    const v = parseFloat(venta)  || 0;
    if (!c || !v) return null;
    const pct = (((v - c) / c) * 100).toFixed(0);
    return { valor: v - c, pct };
  };

  const filtrados = medicamentos.filter(m =>
    m.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Totales para el resumen
  const totalProductos   = medicamentos.length;
  const stockBajo        = medicamentos.filter(m => m.stock <= m.stock_minimo).length;
  const valorInventario  = medicamentos.reduce((s, m) => s + (parseFloat(m.precio_compra)||0) * (parseFloat(m.stock)||0), 0);
  const valorVenta       = medicamentos.reduce((s, m) => s + (parseFloat(m.precio_venta || m.precio)||0) * (parseFloat(m.stock)||0), 0);

  return (
    <div className="p-6">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">💊 Medicamentos</h1>
          <p className="text-gray-500">Inventario con costos y precios de venta</p>
        </div>
        <button onClick={() => abrirModal()}
          className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-medium transition">
          + Nuevo Medicamento
        </button>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-orange-400">
          <p className="text-xs text-gray-500 uppercase font-semibold">Productos</p>
          <p className="text-2xl font-bold text-gray-800">{totalProductos}</p>
        </div>
        <div className={`bg-white rounded-xl shadow p-4 border-l-4 ${stockBajo > 0 ? 'border-red-400' : 'border-green-400'}`}>
          <p className="text-xs text-gray-500 uppercase font-semibold">Stock Bajo</p>
          <p className={`text-2xl font-bold ${stockBajo > 0 ? 'text-red-600' : 'text-green-600'}`}>{stockBajo}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-400">
          <p className="text-xs text-gray-500 uppercase font-semibold">Costo inventario</p>
          <p className="text-xl font-bold text-blue-700">${valorInventario.toLocaleString('es-CO')}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-teal-400">
          <p className="text-xs text-gray-500 uppercase font-semibold">Valor en venta</p>
          <p className="text-xl font-bold text-teal-700">${valorVenta.toLocaleString('es-CO')}</p>
          {valorInventario > 0 && (
            <p className="text-xs text-green-600 font-medium mt-0.5">
              +${(valorVenta - valorInventario).toLocaleString('es-CO')} ganancia potencial
            </p>
          )}
        </div>
      </div>

      {/* Búsqueda */}
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <input type="text" placeholder="🔍 Buscar medicamento..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {cargando ? (
          <div className="p-8 text-center text-gray-500">⏳ Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-6xl">💊</span>
            <p className="mt-3 text-gray-500">No hay medicamentos</p>
            <button onClick={() => abrirModal()} className="mt-4 bg-orange-600 text-white px-4 py-2 rounded-lg">Agregar</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Nombre','Categoría','Stock','Costo Compra','Precio Venta','Margen','Vencimiento','Estado','Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(m => {
                  const mg = margen(m.precio_compra, m.precio_venta || m.precio);
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{m.nombre}</p>
                        {m.descripcion && <p className="text-xs text-gray-400">{m.descripcion.substring(0,40)}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{m.categoria||'-'}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${m.stock <= m.stock_minimo ? 'text-red-600' : 'text-gray-800'}`}>
                          {m.stock} {m.unidad}
                        </span>
                      </td>
                      {/* Costo compra */}
                      <td className="px-4 py-3">
                        <span className="text-red-700 font-semibold text-sm">
                          ${parseFloat(m.precio_compra||0).toLocaleString('es-CO')}
                        </span>
                      </td>
                      {/* Precio venta */}
                      <td className="px-4 py-3">
                        <span className="text-green-700 font-semibold text-sm">
                          ${parseFloat(m.precio_venta || m.precio || 0).toLocaleString('es-CO')}
                        </span>
                      </td>
                      {/* Margen */}
                      <td className="px-4 py-3">
                        {mg ? (
                          <div>
                            <span className="text-teal-700 font-bold text-sm">+${mg.valor.toLocaleString('es-CO')}</span>
                            <p className="text-xs text-teal-500">{mg.pct}%</p>
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {m.fecha_vencimiento ? new Date(m.fecha_vencimiento).toLocaleDateString('es-CO') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {m.stock <= m.stock_minimo
                          ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">⚠️ Stock bajo</span>
                          : <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">✅ OK</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => abrirModal(m)} className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg text-sm hover:bg-yellow-200">✏️ Editar</button>
                          <button onClick={() => eliminar(m.id)} className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm hover:bg-red-200">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">{editando ? '✏️ Editar Medicamento' : '💊 Nuevo Medicamento'}</h2>
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
                    placeholder="ml, tabletas, unidad..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock actual</label>
                  <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
                  <input type="number" value={form.stock_minimo} onChange={e => setForm({...form, stock_minimo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>

                {/* Precios con preview de margen */}
                <div>
                  <label className="block text-sm font-medium text-red-600 mb-1">💸 Costo de compra</label>
                  <input type="number" step="0.01" value={form.precio_compra}
                    onChange={e => setForm({...form, precio_compra: e.target.value})}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-green-600 mb-1">💰 Precio de venta</label>
                  <input type="number" step="0.01" value={form.precio_venta}
                    onChange={e => setForm({...form, precio_venta: e.target.value})}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>

                {/* Preview margen */}
                {form.precio_compra && form.precio_venta && (
                  <div className="col-span-2 bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-center">
                    {(() => {
                      const c = parseFloat(form.precio_compra);
                      const v = parseFloat(form.precio_venta);
                      const ganancia = v - c;
                      const pct = ((ganancia / c) * 100).toFixed(1);
                      return ganancia >= 0
                        ? <span className="text-teal-700 font-semibold">✅ Ganancia por unidad: <b>${ganancia.toLocaleString('es-CO')}</b> ({pct}%)</span>
                        : <span className="text-red-600 font-semibold">⚠️ Precio de venta menor al costo</span>;
                    })()}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Vencimiento</label>
                  <input type="date" value={form.fecha_vencimiento}
                    onChange={e => setForm({...form, fecha_vencimiento: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalAbierto(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
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