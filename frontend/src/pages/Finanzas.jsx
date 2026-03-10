import { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';

export default function Finanzas() {
  const { usuario } = useContext(AuthContext);
  const tieneAcceso = usuario?.rol === 'admin' || usuario?.puede_ver_finanzas;

  const [tab, setTab] = useState('resumen');
  const [movimientos, setMovimientos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [filtros, setFiltros] = useState({
    desde: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    hasta: new Date().toISOString().split('T')[0],
    tipo: ''
  });
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ tipo: 'ingreso', categoria_id: '', concepto: '', monto: '', fecha: new Date().toISOString().split('T')[0], notas: '' });

  useEffect(() => {
    if (tieneAcceso) cargarTodo();
  }, [filtros]);

  const cargarTodo = async () => {
    try {
      const params = { desde: filtros.desde, hasta: filtros.hasta };
      if (filtros.tipo) params.tipo = filtros.tipo;
      const [mov, cat, res] = await Promise.all([
        api.get('/finanzas', { params }),
        api.get('/finanzas/categorias'),
        api.get('/finanzas/resumen', { params })
      ]);
      setMovimientos(mov.data);
      setCategorias(cat.data);
      setResumen(res.data);
    } catch (err) {
      toast.error('Error al cargar datos financieros');
    }
  };

  const abrirModal = (m = null) => {
    if (m) {
      setEditando(m);
      setForm({ tipo: m.tipo, categoria_id: m.categoria_id || '', concepto: m.concepto, monto: m.monto, fecha: m.fecha?.split('T')[0] || '', notas: m.notas || '' });
    } else {
      setEditando(null);
      setForm({ tipo: 'ingreso', categoria_id: '', concepto: '', monto: '', fecha: new Date().toISOString().split('T')[0], notas: '' });
    }
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        await api.put(`/finanzas/${editando.id}`, form);
        toast.success('✅ Movimiento actualizado');
      } else {
        await api.post('/finanzas', form);
        toast.success('✅ Movimiento registrado');
      }
      setModal(false);
      cargarTodo();
    } catch (err) {
      toast.error('Error al guardar');
    }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este movimiento?')) return;
    try {
      await api.delete(`/finanzas/${id}`);
      toast.success('Eliminado');
      cargarTodo();
    } catch (err) { toast.error('Error'); }
  };

  const fmt = (n) => parseFloat(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

  if (!tieneAcceso) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-700">Acceso restringido</h2>
          <p className="text-gray-500 mt-2">No tienes permisos para ver el módulo de finanzas.</p>
        </div>
      </div>
    );
  }

  const categoriasIngreso = categorias.filter(c => c.tipo === 'ingreso');
  const categoriasGasto = categorias.filter(c => c.tipo === 'gasto');

  return (
    <div className="p-6">
      <Toaster position="top-right" />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">💰 Finanzas</h1>
          <p className="text-gray-500">Ingresos, gastos y causaciones</p>
        </div>
        <button onClick={() => abrirModal()}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium transition">
          + Registrar movimiento
        </button>
      </div>

      {/* Filtros de fecha */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 flex gap-4 flex-wrap items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Desde</label>
          <input type="date" value={filtros.desde} onChange={e => setFiltros({...filtros, desde: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hasta</label>
          <input type="date" value={filtros.hasta} onChange={e => setFiltros({...filtros, hasta: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div className="flex gap-2">
          {['', 'ingreso', 'gasto'].map(t => (
            <button key={t} onClick={() => setFiltros({...filtros, tipo: t})}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                filtros.tipo === t ? 'bg-green-600 text-white border-green-600' : 'text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}>
              {t === '' ? 'Todos' : t === 'ingreso' ? '📈 Ingresos' : '📉 Gastos'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl shadow p-2 w-fit">
        {[['resumen','📊 Resumen'],['movimientos','📋 Movimientos']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-5 py-2 rounded-lg font-medium transition text-sm ${tab === id ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ═══ RESUMEN ════════════════════════════════════════════════════════ */}
      {tab === 'resumen' && resumen && (
        <div className="space-y-6">
          {/* Tarjetas principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <p className="text-sm text-green-600 font-medium">📈 Total Ingresos</p>
              <p className="text-3xl font-bold text-green-700 mt-1">{fmt(resumen.total_ingresos)}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <p className="text-sm text-red-600 font-medium">📉 Total Gastos</p>
              <p className="text-3xl font-bold text-red-700 mt-1">{fmt(resumen.total_gastos)}</p>
            </div>
            <div className={`border rounded-xl p-5 ${parseFloat(resumen.utilidad) >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
              <p className={`text-sm font-medium ${parseFloat(resumen.utilidad) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {parseFloat(resumen.utilidad) >= 0 ? '✅ Utilidad' : '⚠️ Pérdida'}
              </p>
              <p className={`text-3xl font-bold mt-1 ${parseFloat(resumen.utilidad) >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                {fmt(resumen.utilidad)}
              </p>
            </div>
          </div>

          {/* Por categoría */}
          {resumen.por_categoria && resumen.por_categoria.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="font-bold text-gray-800 mb-3">📈 Ingresos por categoría</h3>
                <div className="space-y-2">
                  {resumen.por_categoria.filter(c => c.tipo === 'ingreso').map(c => (
                    <div key={c.nombre} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{c.nombre || 'Sin categoría'}</span>
                      <span className="text-sm font-semibold text-green-700">{fmt(c.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="font-bold text-gray-800 mb-3">📉 Gastos por categoría</h3>
                <div className="space-y-2">
                  {resumen.por_categoria.filter(c => c.tipo === 'gasto').map(c => (
                    <div key={c.nombre} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{c.nombre || 'Sin categoría'}</span>
                      <span className="text-sm font-semibold text-red-600">{fmt(c.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ MOVIMIENTOS ════════════════════════════════════════════════════ */}
      {tab === 'movimientos' && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {movimientos.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-5xl mb-3">💰</div>
              <p className="text-gray-500">No hay movimientos en este periodo</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Fecha','Tipo','Categoría','Concepto','Monto','Origen','Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movimientos.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(m.fecha).toLocaleDateString('es-CO')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.tipo === 'ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {m.tipo === 'ingreso' ? '📈' : '📉'} {m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{m.categoria_nombre || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">{m.concepto}</td>
                    <td className={`px-4 py-3 text-sm font-bold ${m.tipo === 'ingreso' ? 'text-green-700' : 'text-red-600'}`}>
                      {m.tipo === 'ingreso' ? '+' : '-'}{fmt(m.monto)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {m.referencia_tipo === 'manual' ? '✍️ Manual' :
                       m.referencia_tipo === 'cita' ? '📅 Cita' :
                       m.referencia_tipo === 'venta_tienda' ? '🛍️ Tienda' :
                       m.referencia_tipo === 'venta_medicamento' ? '💊 Medicamento' : m.referencia_tipo}
                    </td>
                    <td className="px-4 py-3">
                      {m.referencia_tipo === 'manual' && (
                        <div className="flex gap-2">
                          <button onClick={() => abrirModal(m)}
                            className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs hover:bg-yellow-200">✏️</button>
                          <button onClick={() => eliminar(m.id)}
                            className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs hover:bg-red-200">🗑️</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MODAL MOVIMIENTO */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b">
              <h2 className="text-lg font-bold text-gray-800">{editando ? '✏️ Editar Movimiento' : '💰 Nuevo Movimiento'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Tipo */}
              <div className="grid grid-cols-2 gap-2">
                {['ingreso','gasto'].map(t => (
                  <button key={t} type="button" onClick={() => setForm({...form, tipo: t, categoria_id: ''})}
                    className={`py-3 rounded-xl border-2 font-medium text-sm transition ${
                      form.tipo === t
                        ? t === 'ingreso' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-600'
                    }`}>
                    {t === 'ingreso' ? '📈 Ingreso' : '📉 Gasto'}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select value={form.categoria_id} onChange={e => setForm({...form, categoria_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Sin categoría</option>
                  {(form.tipo === 'ingreso' ? categoriasIngreso : categoriasGasto).map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
                <input value={form.concepto} onChange={e => setForm({...form, concepto: e.target.value})}
                  required placeholder="Descripción del movimiento"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input type="number" step="0.01" min="0" value={form.monto}
                      onChange={e => setForm({...form, monto: e.target.value})}
                      required className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})}
                  rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
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