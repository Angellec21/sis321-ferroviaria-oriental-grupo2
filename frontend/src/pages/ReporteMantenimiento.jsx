import { useEffect, useState } from 'react';
import api from '../api/client';
import Spinner from '../components/Spinner';
import EstadoVacio from '../components/EstadoVacio';

export default function ReporteMantenimiento() {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/reportes/mantenimiento')
      .then((r) => setDatos(r.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Error al cargar el reporte'))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div>
      <h2>🔧 Query C — Trenes con Mantenimiento Preventivo Próximo</h2>

      {error && <div className="error-msg">{error}</div>}

      {cargando ? <Spinner /> : datos.length === 0 ? (
        <EstadoVacio icono="✅" mensaje="No hay órdenes de mantenimiento pendientes." />
      ) : (
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>Tren</th><th>Viajes Acum.</th><th>Orden</th><th>Tipo Mant.</th>
                <th>Viajes Restantes</th><th>% Tiempo Rest.</th><th>Fecha Proyectada</th>
                <th>Prioridad</th><th>Estado Orden</th><th>Costo Est.</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((r, i) => (
                <tr key={i}>
                  <td>{r.codigoTren}</td>
                  <td>{r.viajesAcumulados}</td>
                  <td>{r.ordenMantenimiento}</td>
                  <td>{r.tipoMantenimiento}</td>
                  <td>{r.viajesRestantes}</td>
                  <td>{r.porcentajeTiempoRestante}%</td>
                  <td>{new Date(r.fechaProyectadaVencimiento).toLocaleDateString('es-BO')}</td>
                  <td><span className={`badge ${r.prioridad}`}>{r.prioridad}</span></td>
                  <td>{r.estadoOrden}</td>
                  <td>Bs {Number(r.costoEstimado).toLocaleString('es-BO')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
