import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import Spinner from '../components/Spinner';

export default function DetalleVenta() {
  const { id } = useParams();
  const [venta, setVenta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = () => {
    setCargando(true);
    api.get(`/ventas/${id}`)
      .then((r) => setVenta(r.data.data))
      .catch((err) => setError(err.response?.data?.message || 'Error al cargar la venta'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, [id]);

  const cancelar = async (idReserva) => {
    if (!window.confirm('¿Cancelar esta reserva y liberar el asiento?')) return;
    try {
      await api.patch(`/ventas/reservas/${idReserva}/cancelar`);
      cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cancelar la reserva');
    }
  };

  if (cargando) return <Spinner />;
  if (error) return <div className="error-msg">{error}</div>;
  if (!venta) return null;

  return (
    <div>
      <p><Link to="/ventas">&larr; Volver a Ventas</Link></p>
      <h2>🧾 Venta {venta.codigo_venta}</h2>
      <div className="tarjetas">
        <div className="tarjeta">
          <h3>Estación</h3>
          <p className="valor" style={{ fontSize: '1.1rem' }}>{venta.estacion}</p>
        </div>
        <div className="tarjeta">
          <h3>Monto Total</h3>
          <p className="valor">Bs {Number(venta.monto_total).toLocaleString('es-BO')}</p>
        </div>
        <div className="tarjeta">
          <h3>Fecha</h3>
          <p className="valor" style={{ fontSize: '1.1rem' }}>{new Date(venta.fecha_venta).toLocaleString('es-BO')}</p>
        </div>
      </div>

      <h3>Reservas</h3>
      <div className="tabla-scroll">
        <table>
          <thead><tr><th>Código</th><th>Pasajero</th><th>Asiento</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {venta.reservas.map((r) => (
              <tr key={r.id_reserva}>
                <td>{r.codigo_reserva}</td>
                <td>{r.nombre_pasajero}</td>
                <td>{r.id_asiento}</td>
                <td><span className={`badge ${r.estado_reserva === 'cancelada' ? 'baja' : r.estado_reserva === 'pagada' ? 'normal' : 'proximo'}`}>{r.estado_reserva}</span></td>
                <td>
                  {r.estado_reserva !== 'cancelada' && (
                    <button onClick={() => cancelar(r.id_reserva)}>Cancelar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Pagos</h3>
      <div className="tabla-scroll">
        <table>
          <thead><tr><th>Código</th><th>Tipo</th><th>Monto</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            {venta.pagos.map((p) => (
              <tr key={p.id_pago}>
                <td>{p.codigo_pago}</td>
                <td>{p.tipo_pago}</td>
                <td>Bs {Number(p.monto).toLocaleString('es-BO')}</td>
                <td>{p.estado_pago}</td>
                <td>{new Date(p.fecha_pago).toLocaleString('es-BO')}</td>
              </tr>
            ))}
            {venta.pagos.length === 0 && <tr><td colSpan={5}>Sin pagos registrados.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
