import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Spinner from '../components/Spinner';
import EstadoVacio from '../components/EstadoVacio';

export default function Ventas() {
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get('/ventas')
      .then((r) => setVentas(r.data.data))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div>
      <h2>🧾 Ventas Registradas</h2>
      {cargando ? <Spinner /> : ventas.length === 0 ? (
        <EstadoVacio icono="🧾" mensaje="No hay ventas registradas todavía." />
      ) : (
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr><th>Código</th><th>Estación</th><th>Vendedor</th><th>Monto</th><th>Fecha</th><th>Sincronizada</th></tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <tr key={v.id_venta}>
                  <td><Link to={`/ventas/${v.id_venta}`}>{v.codigo_venta}</Link></td>
                  <td>{v.estacion}</td>
                  <td>{v.vendedor || '—'}</td>
                  <td>Bs {Number(v.monto_total).toLocaleString('es-BO')}</td>
                  <td>{new Date(v.fecha_venta).toLocaleString('es-BO')}</td>
                  <td>{v.sincronizado_central ? '✅' : '⏳'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
