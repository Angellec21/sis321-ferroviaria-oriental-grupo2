import { useEffect, useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

const COLORES = ['#4f6df5', '#8affb0', '#ffcf8a', '#ff8a8a', '#b48aff'];

export default function Dashboard() {
  const { tienePermiso } = useAuth();
  const [ingresos, setIngresos] = useState([]);
  const [ocupacion, setOcupacion] = useState([]);
  const [mantenimiento, setMantenimiento] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const tareas = [];

      if (tienePermiso('reportes:ingresos')) {
        tareas.push(
          api.get('/reportes/ingresos', { params: { fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31' } })
            .then((r) => setIngresos(r.data.data))
            .catch(() => {})
        );
      }
      if (tienePermiso('reportes:ocupacion')) {
        tareas.push(
          api.get('/reportes/ocupacion', { params: { fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31' } })
            .then((r) => setOcupacion(r.data.data))
            .catch(() => {})
        );
      }
      if (tienePermiso('reportes:mantenimiento')) {
        tareas.push(
          api.get('/reportes/mantenimiento')
            .then((r) => setMantenimiento(r.data.data))
            .catch(() => {})
        );
      }

      await Promise.all(tareas);
      setCargando(false);
    }
    cargar();
  }, [tienePermiso]);

  const ingresoTotal = ingresos.reduce((acc, r) => acc + Number(r.montoTotal), 0);
  const ocupacionPromedio = ocupacion.length
    ? (ocupacion.reduce((acc, r) => acc + Number(r.ocupacionPromedio), 0) / ocupacion.length).toFixed(1)
    : '—';
  const urgentes = mantenimiento.filter((m) => m.prioridad === 'urgente').length;

  const ingresosPorMetodo = Object.values(
    ingresos.reduce((acc, r) => {
      acc[r.metodoPago] = acc[r.metodoPago] || { nombre: r.metodoPago, total: 0 };
      acc[r.metodoPago].total += Number(r.montoTotal);
      return acc;
    }, {})
  );

  const ocupacionPorRuta = ocupacion.map((r) => ({
    ruta: r.ruta.length > 18 ? r.ruta.slice(0, 16) + '…' : r.ruta,
    ocupacion: Number(r.ocupacionPromedio)
  }));

  if (cargando) return <Spinner texto="Cargando indicadores..." />;

  return (
    <div>
      <h2>📊 Tablero de Control</h2>
      <div className="tarjetas">
        <div className="tarjeta">
          <h3>💰 Ingresos Totales</h3>
          <p className="valor">Bs {ingresoTotal.toLocaleString('es-BO')}</p>
        </div>
        <div className="tarjeta">
          <h3>🚆 Ocupación Promedio</h3>
          <p className="valor">{ocupacionPromedio}%</p>
        </div>
        <div className="tarjeta">
          <h3>🔧 Mantenimientos Urgentes</h3>
          <p className="valor">{urgentes}</p>
        </div>
        <div className="tarjeta">
          <h3>📋 Rutas Monitoreadas</h3>
          <p className="valor">{ocupacion.length}</p>
        </div>
      </div>

      <div className="tarjetas tarjetas-graficos">
        {ingresosPorMetodo.length > 0 && (
          <div className="tarjeta">
            <h3>Ingresos por método de pago</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={ingresosPorMetodo} dataKey="total" nameKey="nombre" outerRadius={90} label>
                  {ingresosPorMetodo.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `Bs ${Number(v).toLocaleString('es-BO')}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {ocupacionPorRuta.length > 0 && (
          <div className="tarjeta">
            <h3>Ocupación promedio por ruta</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ocupacionPorRuta}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262a35" />
                <XAxis dataKey="ruta" stroke="#7c8597" fontSize={12} />
                <YAxis stroke="#7c8597" fontSize={12} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="ocupacion" fill="#4f6df5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {ingresos.length > 0 && (
        <>
          <h3>Ingresos por método de pago (detalle)</h3>
          <table>
            <thead>
              <tr><th>Método</th><th>Fecha</th><th>Transacciones</th><th>Monto Total</th><th>Tasa Éxito</th></tr>
            </thead>
            <tbody>
              {ingresos.slice(0, 5).map((r, i) => (
                <tr key={i}>
                  <td>{r.metodoPago}</td>
                  <td>{new Date(r.fecha).toLocaleDateString('es-BO')}</td>
                  <td>{r.transacciones}</td>
                  <td>Bs {Number(r.montoTotal).toLocaleString('es-BO')}</td>
                  <td>{r.tasaExito}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
