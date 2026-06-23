import { useEffect, useState } from 'react';
import api from '../api/client';
import PublicHeader from '../components/PublicHeader';
import Spinner from '../components/Spinner';
import EstadoVacio from '../components/EstadoVacio';
import '../components/PublicHeader.css';

const PASOS = ['viaje', 'pasajeros', 'pago', 'confirmacion'];
const ETIQUETAS = { viaje: '1. Viaje', pasajeros: '2. Pasajeros', pago: '3. Pago', confirmacion: '4. Listo' };

function patronQr(semilla) {
  const celdas = [];
  let hash = 0;
  for (let i = 0; i < semilla.length; i++) hash = (hash * 31 + semilla.charCodeAt(i)) % 100000;
  for (let i = 0; i < 64; i++) {
    hash = (hash * 1103515245 + 12345) % 2147483648;
    celdas.push(hash % 3 !== 0);
  }
  return celdas;
}

export default function ComprarPasaje() {
  const [paso, setPaso] = useState('viaje');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const [viajes, setViajes] = useState([]);
  const [idViaje, setIdViaje] = useState('');

  const [asientos, setAsientos] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [nombrePasajero, setNombrePasajero] = useState('');
  const [documentoPasajero, setDocumentoPasajero] = useState('');

  const [compra, setCompra] = useState(null);
  const [metodoPago, setMetodoPago] = useState(null);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    api.get('/public/viajes').then((r) => setViajes(r.data.data)).catch(() => {});
  }, []);

  const elegirViaje = async () => {
    if (!idViaje) return;
    setError('');
    setCargando(true);
    try {
      const { data } = await api.get(`/public/viajes/${idViaje}/asientos`);
      setAsientos(data.data);
      setSeleccionados([]);
      setPaso('pasajeros');
    } catch {
      setError('No se pudieron cargar los asientos de este viaje');
    } finally {
      setCargando(false);
    }
  };

  const agregarPasajero = () => {
    if (!nombrePasajero || !documentoPasajero) {
      setError('Ingresa nombre y documento del pasajero');
      return;
    }
    const asientoLibre = asientos.find((a) => !seleccionados.some((s) => s.id_asiento === a.id_asiento));
    if (!asientoLibre) {
      setError('No hay más asientos disponibles en este viaje');
      return;
    }
    setSeleccionados([...seleccionados, {
      id_asiento: asientoLibre.id_asiento,
      codigo_asiento: asientoLibre.codigo_asiento,
      nombre_pasajero: nombrePasajero,
      documento_pasajero: documentoPasajero
    }]);
    setNombrePasajero('');
    setDocumentoPasajero('');
    setError('');
  };

  const quitarPasajero = (idAsiento) => {
    setSeleccionados(seleccionados.filter((s) => s.id_asiento !== idAsiento));
  };

  const continuarAPago = async () => {
    setError('');
    setCargando(true);
    try {
      const { data } = await api.post('/public/compras', {
        id_viaje: Number(idViaje),
        pasajeros: seleccionados
      });
      setCompra(data.data.venta);
      setPaso('pago');
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar la compra. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const confirmarPago = async () => {
    setError('');
    setProcesandoPago(true);
    try {
      await new Promise((r) => setTimeout(r, 1400)); // simula tiempo de la pasarela externa
      await api.post('/public/pagos', { id_venta: compra.id_venta, tipo_pago: metodoPago });
      const { data } = await api.get(`/public/compras/${compra.codigo_venta}`);
      setTicket(data.data);
      setPaso('confirmacion');
    } catch (err) {
      setError(err.response?.data?.message || 'La pasarela no pudo procesar el pago. Intenta de nuevo.');
    } finally {
      setProcesandoPago(false);
    }
  };

  const comprarOtro = () => {
    setPaso('viaje');
    setIdViaje('');
    setAsientos([]);
    setSeleccionados([]);
    setCompra(null);
    setMetodoPago(null);
    setTicket(null);
    setError('');
  };

  return (
    <div className="publico-page">
      <PublicHeader />
      <div className="publico-contenido">
        <div className="pasos-compra">
          {PASOS.map((p) => (
            <span key={p} className={p === paso ? 'paso-activo' : ''}>{ETIQUETAS[p]}</span>
          ))}
        </div>

        {error && <div className="error-msg">{error}</div>}

        {paso === 'viaje' && (
          <div className="tarjeta-form">
            <h3>Elige tu viaje</h3>
            <p style={{ color: '#b8a890', fontSize: '0.85rem' }}>
              No necesitas crear una cuenta. Elige tu viaje, tus asientos y paga directo.
            </p>
            <div className="filtros">
              <label style={{ flex: '2 1 280px' }}>
                Viaje
                <select value={idViaje} onChange={(e) => setIdViaje(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {viajes.map((v) => (
                    <option key={v.id_viaje} value={v.id_viaje}>
                      {v.ruta} — {new Date(v.fecha_salida).toLocaleString('es-BO')} ({v.codigo_tren})
                    </option>
                  ))}
                </select>
              </label>
              <button className="primario" onClick={elegirViaje} disabled={!idViaje || cargando}>
                {cargando ? 'Cargando...' : 'Continuar'}
              </button>
            </div>
          </div>
        )}

        {paso === 'pasajeros' && (
          <div className="tarjeta-form">
            <h3>Pasajeros — {asientos.length - seleccionados.length} asiento(s) disponibles</h3>
            <div className="filtros">
              <label>
                Nombre completo
                <input value={nombrePasajero} onChange={(e) => setNombrePasajero(e.target.value)} />
              </label>
              <label>
                Documento de identidad
                <input value={documentoPasajero} onChange={(e) => setDocumentoPasajero(e.target.value)} />
              </label>
              <button className="primario" onClick={agregarPasajero}>+ Agregar</button>
            </div>

            {seleccionados.length === 0 ? (
              <EstadoVacio icono="🪪" mensaje="Agrega al menos un pasajero para continuar." />
            ) : (
              <div className="tabla-scroll">
                <table>
                  <thead><tr><th>Asiento</th><th>Pasajero</th><th>Documento</th><th></th></tr></thead>
                  <tbody>
                    {seleccionados.map((s) => (
                      <tr key={s.id_asiento}>
                        <td>{s.codigo_asiento}</td>
                        <td>{s.nombre_pasajero}</td>
                        <td>{s.documento_pasajero}</td>
                        <td><button className="secundario" onClick={() => quitarPasajero(s.id_asiento)}>Quitar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              className="primario"
              style={{ marginTop: '1rem' }}
              disabled={seleccionados.length === 0 || cargando}
              onClick={continuarAPago}
            >
              {cargando ? 'Procesando...' : `Continuar al pago (${seleccionados.length} pasajero(s))`}
            </button>
          </div>
        )}

        {paso === 'pago' && compra && (
          <div className="tarjeta-form">
            <h3>Pasarela de Pagos</h3>
            <p>Total a pagar: <strong style={{ color: 'var(--amarillo)' }}>Bs {Number(compra.monto_total).toLocaleString('es-BO')}</strong></p>

            <div className="metodo-pago-opciones">
              <div
                className={`metodo-pago-card ${metodoPago === 'qr' ? 'activo' : ''}`}
                onClick={() => setMetodoPago('qr')}
              >
                📱 Pago QR
              </div>
              <div
                className={`metodo-pago-card ${metodoPago === 'transferencia' ? 'activo' : ''}`}
                onClick={() => setMetodoPago('transferencia')}
              >
                🏦 Transferencia
              </div>
            </div>

            {metodoPago === 'qr' && (
              <div className="qr-box">
                <div className="qr-pattern">
                  {patronQr(compra.codigo_venta).map((on, i) => (
                    <span key={i} className={on ? '' : 'off'} />
                  ))}
                </div>
                <code>{compra.codigo_venta}</code>
                <small>Escanea con tu app bancaria o billetera digital</small>
              </div>
            )}

            {metodoPago === 'transferencia' && (
              <div className="tarjeta" style={{ marginBottom: '1rem' }}>
                <p><strong>Banco:</strong> Banco Ferroviario Oriental</p>
                <p><strong>Cuenta:</strong> 4001-998877-01</p>
                <p><strong>Titular:</strong> Ferroviaria Oriental S.A.</p>
                <p><strong>Referencia:</strong> {compra.codigo_venta}</p>
              </div>
            )}

            {metodoPago && (
              <button className="primario" onClick={confirmarPago} disabled={procesandoPago}>
                {procesandoPago
                  ? 'Procesando con la pasarela...'
                  : metodoPago === 'qr' ? 'Ya escaneé, confirmar pago' : 'Ya transferí, confirmar pago'}
              </button>
            )}
            {procesandoPago && <Spinner texto="Conectando con la pasarela de pagos..." />}
          </div>
        )}

        {paso === 'confirmacion' && ticket && (
          <div className="ticket-card">
            <h3 style={{ marginTop: 0 }}>✅ Pago aprobado — {ticket.codigo_venta}</h3>
            <p>{ticket.reservas[0]?.ruta} · {new Date(ticket.reservas[0]?.fecha_salida).toLocaleString('es-BO')}</p>
            <div className="tabla-scroll">
              <table>
                <thead><tr><th>Asiento</th><th>Pasajero</th><th>Código</th></tr></thead>
                <tbody>
                  {ticket.reservas.map((r) => (
                    <tr key={r.id_reserva}>
                      <td>{r.codigo_asiento}</td>
                      <td>{r.nombre_pasajero}</td>
                      <td>{r.codigo_reserva}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: '1rem' }}>
              Total pagado: <strong style={{ color: 'var(--amarillo)' }}>Bs {Number(ticket.monto_total).toLocaleString('es-BO')}</strong>
            </p>
            <p style={{ color: '#b8a890', fontSize: '0.85rem' }}>
              Guarda el código <strong>{ticket.codigo_venta}</strong> para presentarlo al abordar.
            </p>
            <button className="primario" onClick={comprarOtro}>Comprar otro pasaje</button>
          </div>
        )}
      </div>
    </div>
  );
}
