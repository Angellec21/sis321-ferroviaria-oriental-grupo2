import { useEffect, useState } from 'react';
import api from '../api/client';
import Spinner from '../components/Spinner';
import EstadoVacio from '../components/EstadoVacio';

export default function ReporteIngresos() {
  const [fechaInicio, setFechaInicio] = useState('2026-01-01');
  const [fechaFin, setFechaFin] = useState('2026-12-31');
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const buscar = async () => {
    setCargando(true);
    setError('');
    try {
      const { data } = await api.get('/reportes/ingresos', {
        params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin }
      });
      setDatos(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar el reporte');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { buscar(); }, []);

  return (
    <div>
      <h2>💰 Query A — Ingresos por Método de Pago</h2>

      <div className="filtros">
        <label>
          Desde
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
        </label>
        <button className="primario" onClick={buscar} disabled={cargando}>
          {cargando ? 'Buscando...' : 'Filtrar'}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {cargando ? <Spinner /> : datos.length === 0 ? (
        <EstadoVacio icono="💸" mensaje="Sin resultados para el rango seleccionado." />
      ) : (
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>Método</th><th>Fecha</th><th># Trans.</th><th>Monto Total</th>
                <th>Promedio</th><th>Mín</th><th>Máx</th><th>Desv. Std</th><th>Tasa Éxito</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((r, i) => (
                <tr key={i}>
                  <td>{r.metodoPago}</td>
                  <td>{new Date(r.fecha).toLocaleDateString('es-BO')}</td>
                  <td>{r.transacciones}</td>
                  <td>Bs {Number(r.montoTotal).toLocaleString('es-BO')}</td>
                  <td>Bs {Number(r.montoPromedio).toLocaleString('es-BO')}</td>
                  <td>Bs {Number(r.montoMinimo).toLocaleString('es-BO')}</td>
                  <td>Bs {Number(r.montoMaximo).toLocaleString('es-BO')}</td>
                  <td>{r.desviacionEstandar}</td>
                  <td>{r.tasaExito}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
