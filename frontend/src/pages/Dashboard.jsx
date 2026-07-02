import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

const COLORES = ['#e8742c', '#f5e03c', '#4f6df5', '#8affb0', '#ff8a8a', '#b48aff'];
const PRIORIDAD_COLOR = { urgente: '#ff8a8a', proximo: '#f5e03c', normal: '#8affb0' };

const hoy = new Date().toISOString().slice(0, 10);
const hace6m = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);

function KPI({ icono, titulo, valor, sub, color = '#e8742c' }) {
  return (
    <div className="tarjeta">
      <h3>{icono} {titulo}</h3>
      <p className="valor" style={{ color }}>{valor}</p>
      {sub && <small style={{ color: '#6b5d49' }}>{sub}</small>}
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <section style={{ marginTop: 32 }}>
      <h3 style={{ borderBottom: '1px solid #3a2c1c', paddingBottom: 8, marginBottom: 16 }}>
        {titulo}
      </h3>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const { tienePermiso, usuario } = useAuth();
  const esAdmin = usuario?.rol_nombre === 'administrador';

  const [data, setData]           = useState(null);
  const [cargando, setCargando]   = useState(true);
  const [fi, setFi]               = useState(hace6m);
  const [ff, setFf]               = useState(hoy);
  const [etlActivo, setEtlActivo] = useState(false);
  const [msgEtl, setMsgEtl]       = useState(null);

  // ── Carga de datos ────────────────────────────────────────────────────────
  const cargar = useCallback(async (fechaInicio, fechaFin) => {
    setCargando(true);
    try {
      const r = await api.get('/dashboard/kpis', {
        params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin }
      });
      setData(r.data.data);
    } catch (e) {
      console.error('Error cargando KPIs:', e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(fi, ff); }, [cargar, fi, ff]);

  // ── Filtro dinámico ───────────────────────────────────────────────────────
  const aplicarFiltro = (e) => {
    e.preventDefault();
    cargar(fi, ff);
  };

  // ── ETL ───────────────────────────────────────────────────────────────────
  const ejecutarETL = async () => {
    setEtlActivo(true);
    setMsgEtl(null);
    try {
      const r = await api.post('/admin/etl/ejecutar');
      const { ocupacion: o, combustible: c, duracionMs } = r.data.data;
      setMsgEtl({ ok: true, texto: `ETL completado en ${duracionMs} ms · +${o.insertados} ocupación · +${c.insertados} combustible` });
      await cargar(fi, ff);
    } catch (e) {
      setMsgEtl({ ok: false, texto: e.response?.data?.message || e.message });
    } finally {
      setEtlActivo(false);
    }
  };

  if (cargando) return <Spinner texto="Cargando Tablero de Control..." />;

  const { kpis = {}, series = {} } = data || {};

  // Series para los gráficos
  const serieIngDia = (series.ingresos_dia || []).map(d => ({
    dia: new Date(d.dia).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }),
    total: Number(d.total),
    cantidad: Number(d.cantidad)
  }));

  const serieMetodo = (series.ingresos_metodo || []).map(m => ({
    nombre: m.metodo ? m.metodo.charAt(0).toUpperCase() + m.metodo.slice(1) : m.metodo,
    total: Number(m.total),
    transacciones: Number(m.transacciones)
  }));

  const serieRuta = (series.ocupacion_ruta || []).map(r => ({
    ruta: r.ruta?.length > 20 ? r.ruta.slice(0, 18) + '…' : r.ruta,
    ocupacion: Number(r.ocupacion_pct)
  }));

  const serieTendencia = (series.tendencia || []).map(t => ({
    semana: new Date(t.semana).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }),
    ocupacion: Number(t.ocupacion_pct)
  }));

  const serieMant = (series.mantenimiento || []).map(m => ({
    prioridad: m.prioridad ? m.prioridad.charAt(0).toUpperCase() + m.prioridad.slice(1) : '',
    cantidad: Number(m.cantidad)
  }));

  return (
    <div>

      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Dashboard Gerencial — DSS Ferroviaria Oriental</h2>
          <p style={{ color: '#6b5d49', margin: '4px 0 0', fontSize: 13 }}>
            Sistema de Soporte a la Decisión · Actividad 7
          </p>
        </div>
        {esAdmin && (
          <button onClick={ejecutarETL} disabled={etlActivo} style={{
            background: etlActivo ? '#3a2c1c' : '#e8742c',
            color: etlActivo ? '#6b5d49' : '#1a1410',
            fontWeight: 700, border: 'none', borderRadius: 8,
            padding: '9px 18px', cursor: etlActivo ? 'not-allowed' : 'pointer', fontSize: 13
          }}>
            {etlActivo ? '⏳ Ejecutando ETL…' : '⚡ Actualizar DW'}
          </button>
        )}
      </div>

      {msgEtl && (
        <div style={{
          marginTop: 10,
          background: msgEtl.ok ? '#0d2a0d' : '#2a0d0d',
          border: `1px solid ${msgEtl.ok ? '#8affb0' : '#ff8a8a'}`,
          borderRadius: 8, padding: '8px 14px', fontSize: 13,
          color: msgEtl.ok ? '#8affb0' : '#ff8a8a'
        }}>
          {msgEtl.ok ? '✅ ' : '❌ '}{msgEtl.texto}
        </div>
      )}

      {/* ── Paso 4: Filtros dinámicos ───────────────────────────────────────── */}
      <form onSubmit={aplicarFiltro} style={{
        marginTop: 20, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap',
        background: '#1a1410', border: '1px solid #3a2c1c', borderRadius: 10, padding: '14px 18px'
      }}>
        <div>
          <label style={{ color: '#b8a890', fontSize: 12, display: 'block', marginBottom: 4 }}>Desde</label>
          <input
            type="date"
            value={fi}
            onChange={e => setFi(e.target.value)}
            style={{
              background: '#201912', color: '#f1e9df', border: '1px solid #3a2c1c',
              borderRadius: 6, padding: '7px 10px', fontSize: 13
            }}
          />
        </div>
        <div>
          <label style={{ color: '#b8a890', fontSize: 12, display: 'block', marginBottom: 4 }}>Hasta</label>
          <input
            type="date"
            value={ff}
            onChange={e => setFf(e.target.value)}
            style={{
              background: '#201912', color: '#f1e9df', border: '1px solid #3a2c1c',
              borderRadius: 6, padding: '7px 10px', fontSize: 13
            }}
          />
        </div>
        <button type="submit" style={{
          background: '#4f6df5', color: '#fff', fontWeight: 700,
          border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontSize: 13
        }}>
          Filtrar
        </button>
        <button type="button" onClick={() => { setFi(hace6m); setFf(hoy); }} style={{
          background: 'transparent', color: '#6b5d49', border: '1px solid #3a2c1c',
          borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 12
        }}>
          Últimos 6 meses
        </button>
      </form>

      {/* ── Paso 2: 8 KPIs principales ─────────────────────────────────────── */}
      <Seccion titulo="KPI 1–8 — Indicadores Clave de Rendimiento">
        <div className="tarjetas">
          <KPI icono="💰" titulo="Ingresos del Período"
            valor={`Bs ${Number(kpis.ingresos_periodo || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`}
            sub={`${kpis.transacciones || 0} transacciones`} color="#f5e03c" />
          <KPI icono="🎫" titulo="Ticket Promedio"
            valor={`Bs ${Number(kpis.ticket_promedio || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`}
            sub="por transacción" color="#e8742c" />
          <KPI icono="🚆" titulo="Ocupación Promedio"
            valor={`${kpis.ocupacion_promedio || 0}%`}
            sub="promedio DW todas las rutas" color="#4f6df5" />
          <KPI icono="📋" titulo="Reservas Activas"
            valor={kpis.reservas_activas ?? '—'}
            sub="en este momento" color="#8affb0" />
          <KPI icono="🚂" titulo="Trenes Operativos"
            valor={kpis.trenes_operativos ?? '—'}
            sub="de la flota" color="#b48aff" />
          <KPI icono="👥" titulo="Usuarios Activos"
            valor={kpis.usuarios_activos ?? '—'}
            sub="en el sistema" color="#ffcf8a" />
          <KPI icono="🔧" titulo="Mantenimiento Urgente"
            valor={kpis.mant_urgentes ?? 0}
            sub="trenes requieren atención"
            color={Number(kpis.mant_urgentes) > 0 ? '#ff8a8a' : '#8affb0'} />
          <KPI icono="📊" titulo="Período Analizado"
            valor={serieIngDia.length > 0 ? `${serieIngDia.length} días` : '—'}
            sub={`${fi} → ${ff}`} color="#6b5d49" />
        </div>
      </Seccion>

      {/* ── Paso 3: Gráfico 1 — Ingresos por día (Barras) ─────────────────── */}
      {serieIngDia.length > 0 && (
        <Seccion titulo="Gráfico 1 — Ingresos por Día (Barras)">
          <div className="tarjeta">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={serieIngDia} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262a35" />
                <XAxis dataKey="dia" stroke="#7c8597" fontSize={12} />
                <YAxis stroke="#7c8597" fontSize={12} tickFormatter={v => `Bs ${v}`} />
                <Tooltip formatter={(v, n) => [n === 'total' ? `Bs ${Number(v).toLocaleString('es-BO')}` : v, n === 'total' ? 'Ingresos' : 'Transacciones']} />
                <Legend />
                <Bar dataKey="total" name="Ingresos (Bs)" fill="#e8742c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cantidad" name="Transacciones" fill="#4f6df5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Seccion>
      )}

      {/* ── Gráfico 2 y 3 en paralelo ──────────────────────────────────────── */}
      {(serieMetodo.length > 0 || serieRuta.length > 0) && (
        <Seccion titulo="Gráficos 2 y 3 — Distribución de Pagos (Pie) · Ocupación por Ruta (Barras)">
          <div className="tarjetas tarjetas-graficos">

            {/* Gráfico 2 — Pie chart */}
            {serieMetodo.length > 0 && (
              <div className="tarjeta">
                <h3>Ingresos por método de pago</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={serieMetodo} dataKey="total" nameKey="nombre"
                      outerRadius={90}
                      label={({ nombre, percent }) => `${nombre} ${(percent * 100).toFixed(0)}%`}
                    >
                      {serieMetodo.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => `Bs ${Number(v).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Gráfico 3 — Barras horizontales */}
            {serieRuta.length > 0 && (
              <div className="tarjeta">
                <h3>Ocupación promedio por ruta (%)</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={serieRuta} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262a35" />
                    <XAxis type="number" stroke="#7c8597" unit="%" domain={[0, 100]} />
                    <YAxis dataKey="ruta" type="category" stroke="#7c8597" fontSize={11} width={140} />
                    <Tooltip formatter={v => [`${v}%`, 'Ocupación']} />
                    <Bar dataKey="ocupacion" radius={[0, 4, 4, 0]}>
                      {serieRuta.map((r, i) => (
                        <Cell key={i} fill={r.ocupacion >= 70 ? '#ff8a8a' : r.ocupacion >= 30 ? '#f5e03c' : '#8affb0'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Seccion>
      )}

      {/* ── Gráfico 4 — Tendencia de ocupación (Línea) ─────────────────────── */}
      {serieTendencia.length > 0 && (
        <Seccion titulo="Gráfico 4 — Tendencia de Ocupación Semanal DW (Línea)">
          <div className="tarjeta">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={serieTendencia} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262a35" />
                <XAxis dataKey="semana" stroke="#7c8597" fontSize={11} />
                <YAxis stroke="#7c8597" unit="%" domain={[0, 100]} />
                <Tooltip formatter={v => [`${v}%`, 'Ocupación']} />
                <Legend />
                <Line
                  type="monotone" dataKey="ocupacion" name="Ocupación promedio"
                  stroke="#e8742c" strokeWidth={2} dot={{ fill: '#e8742c', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Seccion>
      )}

      {/* ── Gráfico 5 — Mantenimiento por prioridad (Barras) ───────────────── */}
      {serieMant.length > 0 && (
        <Seccion titulo="Gráfico 5 — Órdenes de Mantenimiento por Prioridad (Barras)">
          <div className="tarjeta">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={serieMant} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262a35" />
                <XAxis dataKey="prioridad" stroke="#7c8597" />
                <YAxis stroke="#7c8597" allowDecimals={false} />
                <Tooltip formatter={v => [v, 'Órdenes']} />
                <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                  {serieMant.map((m, i) => (
                    <Cell key={i} fill={PRIORIDAD_COLOR[m.prioridad?.toLowerCase()] || COLORES[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Seccion>
      )}

      {/* ── Tablas de detalle (Query A, B, C) ──────────────────────────────── */}
      <TablaIngresos serieMetodo={serieMetodo} />
      <TablaOcupacion serieRuta={serieRuta} />
    </div>
  );
}

// ── Subtablas ──────────────────────────────────────────────────────────────

function TablaIngresos({ serieMetodo }) {
  if (!serieMetodo.length) return null;
  const total = serieMetodo.reduce((s, m) => s + m.total, 0);
  return (
    <Seccion titulo="Query A — Detalle Ingresos por Método de Pago">
      <div className="tabla-scroll">
        <table>
          <thead>
            <tr><th>Método</th><th>Transacciones</th><th>Monto Total</th><th>% del Total</th></tr>
          </thead>
          <tbody>
            {serieMetodo.map((m, i) => (
              <tr key={i}>
                <td>{m.nombre}</td>
                <td>{m.transacciones}</td>
                <td>Bs {m.total.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
                <td>{total > 0 ? ((m.total / total) * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700, color: '#f5e03c' }}>
              <td>TOTAL</td>
              <td>{serieMetodo.reduce((s, m) => s + m.transacciones, 0)}</td>
              <td>Bs {total.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
              <td>100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Seccion>
  );
}

function TablaOcupacion({ serieRuta }) {
  if (!serieRuta.length) return null;
  return (
    <Seccion titulo="Query B — Detalle Ocupación por Ruta">
      <div className="tabla-scroll">
        <table>
          <thead>
            <tr><th>Ruta</th><th>Ocupación Promedio</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {serieRuta.map((r, i) => {
              const pct = Number(r.ocupacion);
              const estado = pct >= 70 ? 'Alta demanda' : pct >= 30 ? 'Normal' : 'Baja demanda';
              const color  = pct >= 70 ? '#ff8a8a' : pct >= 30 ? '#f5e03c' : '#8affb0';
              return (
                <tr key={i}>
                  <td>{r.ruta}</td>
                  <td>{pct}%</td>
                  <td><span style={{ color, fontWeight: 700 }}>{estado}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Seccion>
  );
}
