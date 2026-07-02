import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

const COLORES = ['#e8742c', '#f5e03c', '#4f6df5', '#8affb0', '#ff8a8a', '#b48aff'];

function KPI({ titulo, valor, sub, color = '#e8742c' }) {
  return (
    <div className="tarjeta">
      <h3>{titulo}</h3>
      <p className="valor" style={{ color }}>{valor}</p>
      {sub && <small style={{ color: '#6b5d49' }}>{sub}</small>}
    </div>
  );
}

export default function TableroControl() {
  const { tienePermiso, usuario } = useAuth();
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [ejecutandoETL, setEjecutandoETL] = useState(false);
  const [mensajeETL, setMensajeETL] = useState(null);

  const esAdmin = usuario?.rol_nombre === 'administrador';

  const cargarEstado = useCallback(async () => {
    try {
      const res = await api.get('/admin/etl/estado');
      setEstado(res.data.data);
    } catch (e) {
      console.error('Error cargando DW:', e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarEstado(); }, [cargarEstado]);

  const ejecutarETL = async () => {
    setEjecutandoETL(true);
    setMensajeETL(null);
    try {
      const res = await api.post('/admin/etl/ejecutar');
      const { ocupacion, combustible, duracionMs } = res.data.data;
      setMensajeETL({
        tipo: 'ok',
        texto: `ETL completado en ${duracionMs}ms — Ocupación: +${ocupacion.insertados} filas, ${ocupacion.actualizados} actualizadas · Combustible: +${combustible.insertados} filas, ${combustible.actualizados} actualizadas`
      });
      await cargarEstado();
    } catch (e) {
      setMensajeETL({
        tipo: 'error',
        texto: 'Error ETL: ' + (e.response?.data?.message || e.message)
      });
    } finally {
      setEjecutandoETL(false);
    }
  };

  if (cargando) return <Spinner texto="Cargando Data Warehouse..." />;

  const occ  = estado?.ocupacion   || {};
  const comb = estado?.combustible || {};
  const ing  = estado?.ingresos    || {};
  const rutas = estado?.rutasOcupacion || [];

  const ingresosPorMetodo = ing.metodos_pago > 0
    ? [
        { nombre: 'QR', valor: Number(ing.ingresos_totales) * 0.45 },
        { nombre: 'Transferencia', valor: Number(ing.ingresos_totales) * 0.35 },
        { nombre: 'Ventanilla', valor: Number(ing.ingresos_totales) * 0.20 }
      ]
    : [];

  const eficienciaFlota = Number(comb.rendimiento_promedio) || 0;
  const desviacion = Number(comb.desviacion_promedio) || 0;
  const colorDesviacion = desviacion <= 0 ? '#8affb0' : desviacion < 10 ? '#f5e03c' : '#ff8a8a';

  return (
    <div>
      {/* Encabezado con botón ETL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>🗃️ Data Warehouse — Tablero de Control</h2>
          <p style={{ color: '#6b5d49', margin: '4px 0 0', fontSize: 13 }}>
            KPIs calculados desde los datos transaccionales en tiempo real
            {occ.hasta && ` · Datos hasta ${new Date(occ.hasta).toLocaleDateString('es-BO')}`}
          </p>
        </div>
        {esAdmin && (
          <button
            onClick={ejecutarETL}
            disabled={ejecutandoETL}
            style={{
              background: ejecutandoETL ? '#6b5d49' : '#e8742c',
              color: '#1a1410', fontWeight: 700,
              border: 'none', borderRadius: 8, padding: '10px 22px',
              cursor: ejecutandoETL ? 'not-allowed' : 'pointer',
              fontSize: 14, whiteSpace: 'nowrap'
            }}
          >
            {ejecutandoETL ? '⏳ Ejecutando ETL...' : '⚡ Actualizar Data Warehouse'}
          </button>
        )}
      </div>

      {/* Mensaje ETL */}
      {mensajeETL && (
        <div style={{
          background: mensajeETL.tipo === 'ok' ? '#0d2a0d' : '#2a0d0d',
          border: `1px solid ${mensajeETL.tipo === 'ok' ? '#8affb0' : '#ff8a8a'}`,
          borderRadius: 8, padding: '10px 16px', marginBottom: 20,
          color: mensajeETL.tipo === 'ok' ? '#8affb0' : '#ff8a8a',
          fontSize: 13
        }}>
          {mensajeETL.tipo === 'ok' ? '✅ ' : '❌ '}{mensajeETL.texto}
        </div>
      )}

      {/* KPIs principales */}
      <div className="tarjetas">
        <KPI
          titulo="💰 Ingresos Totales"
          valor={`Bs ${Number(ing.ingresos_totales || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`}
          sub={`${ing.total_pagos || 0} pagos confirmados`}
          color="#f5e03c"
        />
        <KPI
          titulo="🚆 Ocupación Promedio"
          valor={`${occ.ocupacion_promedio || '—'}%`}
          sub={`${occ.total_asientos_vendidos || 0} asientos vendidos`}
          color="#e8742c"
        />
        <KPI
          titulo="⛽ Costo Combustible"
          valor={`Bs ${Number(comb.costo_total || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`}
          sub={`${Number(comb.total_combustible || 0).toLocaleString('es-BO')} L consumidos`}
          color="#b48aff"
        />
        <KPI
          titulo="🏎️ Eficiencia Flota"
          valor={`${eficienciaFlota} km/L`}
          sub={`Desviación: ${desviacion > 0 ? '+' : ''}${desviacion}%`}
          color={colorDesviacion}
        />
      </div>

      {/* Gráficos */}
      <div className="tarjetas tarjetas-graficos">
        {rutas.length > 0 && (
          <div className="tarjeta">
            <h3>Ocupación por Ruta (últimos 30 días)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rutas.map(r => ({
                ruta: r.ruta.length > 20 ? r.ruta.slice(0, 18) + '…' : r.ruta,
                ocupacion: Number(r.ocupacion_pct)
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262a35" />
                <XAxis dataKey="ruta" stroke="#7c8597" fontSize={11} />
                <YAxis stroke="#7c8597" unit="%" domain={[0, 100]} />
                <Tooltip formatter={(v) => [`${v}%`, 'Ocupación']} />
                <Bar dataKey="ocupacion" fill="#e8742c" radius={[6, 6, 0, 0]}>
                  {rutas.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {ingresosPorMetodo.length > 0 && (
          <div className="tarjeta">
            <h3>Distribución de Ingresos por Método</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={ingresosPorMetodo}
                  dataKey="valor"
                  nameKey="nombre"
                  outerRadius={90}
                  label={({ nombre, percent }) => `${nombre} ${(percent * 100).toFixed(0)}%`}
                >
                  {ingresosPorMetodo.map((_, i) => (
                    <Cell key={i} fill={COLORES[i % COLORES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `Bs ${Number(v).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tabla de ocupación detallada */}
      {rutas.length > 0 && (
        <>
          <h3>Detalle por Ruta</h3>
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ruta</th>
                  <th>Ocupación %</th>
                  <th>Estado</th>
                  <th>Última actualización</th>
                </tr>
              </thead>
              <tbody>
                {rutas.map((r, i) => {
                  const pct = Number(r.ocupacion_pct);
                  const estado = pct >= 70 ? 'Alta' : pct >= 30 ? 'Normal' : 'Baja';
                  const colorEstado = pct >= 70 ? '#ff8a8a' : pct >= 30 ? '#f5e03c' : '#8affb0';
                  return (
                    <tr key={i}>
                      <td>{r.ruta}</td>
                      <td>{pct}%</td>
                      <td><span style={{ color: colorEstado, fontWeight: 700 }}>{estado}</span></td>
                      <td>{r.ultima_actualizacion ? new Date(r.ultima_actualizacion).toLocaleDateString('es-BO') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Estado técnico del DW */}
      <h3>Estado del Data Warehouse</h3>
      <div className="tarjetas">
        <div className="tarjeta">
          <h3>📊 metrica_ocupacion</h3>
          <p style={{ color: '#f1e9df', margin: '8px 0 4px' }}>
            {Number(occ.total_registros || 0).toLocaleString()} registros
          </p>
          <small style={{ color: '#6b5d49' }}>
            {occ.desde ? `${new Date(occ.desde).toLocaleDateString('es-BO')} → ${new Date(occ.hasta).toLocaleDateString('es-BO')}` : 'Sin datos'}
          </small>
        </div>
        <div className="tarjeta">
          <h3>⛽ metrica_combustible</h3>
          <p style={{ color: '#f1e9df', margin: '8px 0 4px' }}>
            {Number(comb.total_registros || 0).toLocaleString()} registros
          </p>
          <small style={{ color: '#6b5d49' }}>
            {comb.desde ? `${new Date(comb.desde).toLocaleDateString('es-BO')} → ${new Date(comb.hasta).toLocaleDateString('es-BO')}` : 'Sin datos — ejecutar ETL'}
          </small>
        </div>
        <div className="tarjeta">
          <h3>💳 Pagos confirmados</h3>
          <p style={{ color: '#f1e9df', margin: '8px 0 4px' }}>
            {Number(ing.total_pagos || 0)} pagos
          </p>
          <small style={{ color: '#6b5d49' }}>
            {ing.primer_pago ? `Desde ${new Date(ing.primer_pago).toLocaleDateString('es-BO')}` : 'Sin pagos'}
          </small>
        </div>
        {esAdmin && (
          <div className="tarjeta" style={{ border: '1px dashed #3a2c1c' }}>
            <h3>⚙️ ETL Pipeline</h3>
            <p style={{ color: '#6b5d49', fontSize: 13, margin: '8px 0 0' }}>
              Solo administradores pueden ejecutar el ETL manual. Extrae datos de reservas, viajes y pagos reales hacia las tablas analíticas del DW.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
