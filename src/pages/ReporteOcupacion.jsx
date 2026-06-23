import { useEffect, useState } from 'react';
import api from '../api/client';
import Spinner from '../components/Spinner';
import EstadoVacio from '../components/EstadoVacio';

export default function ReporteOcupacion() {
  const [fechaInicio, setFechaInicio] = useState('2026-01-01');
  const [fechaFin, setFechaFin] = useState('2026-12-31');
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const [rutas, setRutas] = useState([]);
  const [idRutaPred, setIdRutaPred] = useState('');
  const [fechaPred, setFechaPred] = useState('');
  const [prediccion, setPrediccion] = useState(null);
  const [cargandoPred, setCargandoPred] = useState(false);
  const [errorPred, setErrorPred] = useState('');

  const buscar = async () => {
    setCargando(true);
    setError('');
    try {
      const { data } = await api.get('/reportes/ocupacion', {
        params: { fecha_inicio: fechaInicio, fecha_fin: fechaFin }
      });
      setDatos(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar el reporte');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    buscar();
    api.get('/catalogo/rutas').then((r) => setRutas(r.data.data)).catch(() => {});
  }, []);

  const predecir = async () => {
    if (!idRutaPred || !fechaPred) return;
    setCargandoPred(true);
    setErrorPred('');
    setPrediccion(null);
    try {
      const { data } = await api.get('/reportes/prediccion-demanda', {
        params: { id_ruta: idRutaPred, fecha: fechaPred }
      });
      setPrediccion(data.data);
    } catch (err) {
      setErrorPred(err.response?.data?.message || 'Error al consultar el modelo predictivo');
    } finally {
      setCargandoPred(false);
    }
  };

  return (
    <div>
      <h2>🚆 Query B — Tasa de Ocupación por Ruta y Tipo de Vagón</h2>

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
        <EstadoVacio icono="🚆" mensaje="Sin resultados para el rango seleccionado." />
      ) : (
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>Ruta</th><th>Tipo Vagón</th><th>Vagones</th><th>Ocup. Prom.</th>
                <th>Mín</th><th>Máx</th><th>Vendidos</th><th>Disponibles</th>
                <th>Rentabilidad</th><th>Ingresos Est.</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((r, i) => (
                <tr key={i}>
                  <td>{r.ruta}<br /><small style={{ color: '#b8a890' }}>{r.rutaCiudades}</small></td>
                  <td>{r.tipoVagon}</td>
                  <td>{r.vagones}</td>
                  <td>{r.ocupacionPromedio}%</td>
                  <td>{r.ocupacionMinima}%</td>
                  <td>{r.ocupacionMaxima}%</td>
                  <td>{r.asientosVendidos}</td>
                  <td>{r.asientosDisponibles}</td>
                  <td><span className={`badge ${r.rentabilidad}`}>{r.rentabilidad}</span></td>
                  <td>Bs {Number(r.ingresosEstimados).toLocaleString('es-BO')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="tarjeta-form">
        <h3>🤖 Modelo Predictivo de Demanda (Servidor de IA / TensorFlow)</h3>
        <p style={{ color: '#b8a890', fontSize: '0.85rem', marginTop: 0 }}>
          Predice la ocupación esperada de una ruta en una fecha futura, entrenado con el histórico de ocupación.
        </p>
        {errorPred && <div className="error-msg">{errorPred}</div>}
        <div className="filtros">
          <label>
            Ruta
            <select value={idRutaPred} onChange={(e) => setIdRutaPred(e.target.value)}>
              <option value="">Seleccionar...</option>
              {rutas.map((r) => (
                <option key={r.id_ruta} value={r.id_ruta}>{r.nombre}</option>
              ))}
            </select>
          </label>
          <label>
            Fecha a predecir
            <input type="date" value={fechaPred} onChange={(e) => setFechaPred(e.target.value)} />
          </label>
          <button className="primario" onClick={predecir} disabled={!idRutaPred || !fechaPred || cargandoPred}>
            {cargandoPred ? 'Consultando modelo...' : 'Predecir demanda'}
          </button>
        </div>

        {prediccion && (
          <div className="tarjetas" style={{ marginTop: '1rem' }}>
            <div className="tarjeta">
              <h3>Ocupación Estimada</h3>
              <p className="valor">{prediccion.ocupacion_estimada_pct}%</p>
            </div>
            <div className="tarjeta">
              <h3>Margen de Error del Modelo (MAE)</h3>
              <p className="valor" style={{ fontSize: '1.1rem' }}>± {prediccion.mae_validacion_modelo.toFixed(1)} pts</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
