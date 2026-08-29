import { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import PublicHeader from '../components/PublicHeader';
import Spinner from '../components/Spinner';
import EstadoVacio from '../components/EstadoVacio';
import MapaAsientos from '../components/MapaAsientos';
import '../components/PublicHeader.css';

const PASOS = ['viaje', 'pasajeros', 'pago', 'confirmacion'];
const ETIQUETAS = { viaje: '1. Viaje', pasajeros: '2. Pasajeros', pago: '3. Pago', confirmacion: '4. Listo' };

export default function ComprarPasaje() {
  const [paso, setPaso] = useState('viaje');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const [viajes, setViajes] = useState([]);
  const [cargandoViajes, setCargandoViajes] = useState(true);
  const [errorViajes, setErrorViajes] = useState('');
  const [idViaje, setIdViaje] = useState('');
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);

  const [asientos, setAsientos] = useState([]);
  const [asientoElegido, setAsientoElegido] = useState('');
  const [seleccionados, setSeleccionados] = useState([]);
  const [nombrePasajero, setNombrePasajero] = useState('');
  const [documentoPasajero, setDocumentoPasajero] = useState('');

  const [compra, setCompra] = useState(null);
  const [metodoPago, setMetodoPago] = useState(null);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [ticket, setTicket] = useState(null);

  const cargarViajes = useCallback(async () => {
    setCargandoViajes(true);
    setErrorViajes('');
    try {
      const r = await api.get('/public/viajes');
      setViajes(r.data.data || []);
    } catch {
      setErrorViajes('No se pudieron cargar los viajes. El servidor puede estar iniciando, intenta de nuevo en unos segundos.');
    } finally {
      setCargandoViajes(false);
    }
  }, []);

  useEffect(() => {
    cargarViajes();
  }, [cargarViajes]);

  const asientosOcupados = asientos.filter(a =>
    a.estado === 'ocupado' || seleccionados.some(s => s.id_asiento === a.id_asiento)
  );
  const asientosLibres = asientos.filter(a =>
    a.estado !== 'ocupado' && !seleccionados.some(s => s.id_asiento === a.id_asiento)
  );

  const elegirViaje = async () => {
    if (!idViaje) return;
    setError('');
    setCargando(true);
    try {
      const { data } = await api.get(`/public/viajes/${idViaje}/asientos`);
      setAsientos(data.data);
      setSeleccionados([]);
      setAsientoElegido('');
      const viaje = viajes.find(v => String(v.id_viaje) === String(idViaje));
      setViajeSeleccionado(viaje || null);
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
    if (!asientoElegido) {
      setError('Seleccioná un asiento disponible');
      return;
    }
    const asiento = asientos.find(a => String(a.id_asiento) === String(asientoElegido));
    if (!asiento) return;

    setSeleccionados([...seleccionados, {
      id_asiento: asiento.id_asiento,
      codigo_asiento: asiento.codigo_asiento,
      nombre_pasajero: nombrePasajero,
      documento_pasajero: documentoPasajero
    }]);
    setNombrePasajero('');
    setDocumentoPasajero('');
    setAsientoElegido('');
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
      setMetodoPago(null);
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
      await new Promise((r) => setTimeout(r, 1400));
      await api.post('/public/pagos', { codigo_venta: compra.codigo_venta, tipo_pago: metodoPago });
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
    setAsientoElegido('');
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

        {/* ── PASO 1: Elegir viaje ── */}
        {paso === 'viaje' && (
          <div className="tarjeta-form">
            <h3>Elige tu viaje</h3>
            <p style={{ color: '#b8a890', fontSize: '0.85rem' }}>
              No necesitas crear una cuenta. Elige tu viaje, tus asientos y paga directo.
            </p>

            {cargandoViajes && (
              <div style={{ padding: '1.2rem 0', textAlign: 'center' }}>
                <Spinner texto="Cargando viajes disponibles..." />
                <p style={{ color: '#b8a890', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  El servidor puede tardar unos segundos en despertar la primera vez.
                </p>
              </div>
            )}

            {!cargandoViajes && errorViajes && (
              <div style={{ marginBottom: '1rem' }}>
                <div className="error-msg">{errorViajes}</div>
                <button className="secundario" onClick={cargarViajes} style={{ marginTop: '0.5rem' }}>
                  🔄 Reintentar
                </button>
              </div>
            )}

            {!cargandoViajes && !errorViajes && (
              <div className="filtros">
                <label style={{ flex: '2 1 280px' }}>
                  Viaje disponible
                  <select value={idViaje} onChange={(e) => setIdViaje(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {viajes.map((v) => (
                      <option key={v.id_viaje} value={v.id_viaje}>
                        {v.ciudad_origen} → {v.ciudad_destino} | {new Date(v.fecha_salida).toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' })} {new Date(v.fecha_salida).toLocaleTimeString('es-BO', { hour:'2-digit', minute:'2-digit' })} | Bs {Number(v.tarifa_adulto).toFixed(0)} p/persona
                      </option>
                    ))}
                  </select>
                </label>
                <button className="primario" onClick={elegirViaje} disabled={!idViaje || cargando}>
                  {cargando ? 'Cargando...' : 'Ver asientos'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PASO 2: Pasajeros y asientos ── */}
        {paso === 'pasajeros' && (
          <div className="tarjeta-form">
            <h3>Selección de asientos</h3>
            {viajeSeleccionado && (
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.88rem', color: '#b8a890' }}>
                <strong style={{ color: 'var(--amarillo)' }}>{viajeSeleccionado.ciudad_origen} → {viajeSeleccionado.ciudad_destino}</strong>
                &nbsp;·&nbsp;{viajeSeleccionado.ruta}
                &nbsp;·&nbsp;{Number(viajeSeleccionado.distancia_km).toFixed(0)} km
                &nbsp;·&nbsp;~{Math.floor(viajeSeleccionado.duracion_estimada_minutos / 60)}h {viajeSeleccionado.duracion_estimada_minutos % 60}min
                <br />
                Tarifa: <strong style={{ color: '#2ecc71' }}>Bs {Number(viajeSeleccionado.tarifa_adulto).toFixed(0)} adulto</strong>
                &nbsp;/&nbsp;Bs {Number(viajeSeleccionado.tarifa_niño).toFixed(0)} niño
                &nbsp;/&nbsp;Bs {Number(viajeSeleccionado.tarifa_senior).toFixed(0)} senior
                {seleccionados.length > 0 && (
                  <span style={{ float: 'right', color: 'var(--amarillo)', fontWeight: 700 }}>
                    Total estimado: Bs {(Number(viajeSeleccionado.tarifa_adulto) * seleccionados.length).toFixed(0)}
                  </span>
                )}
              </div>
            )}

            {/* Mapa visual de asientos */}
            <MapaAsientos
              asientos={asientos}
              seleccionados={seleccionados}
              asientoActivo={asientoElegido}
              onElegir={(a) => {
                if (a.estado !== 'ocupado') setAsientoElegido(String(a.id_asiento));
              }}
            />

            {/* Formulario agregar pasajero */}
            <div className="filtros" style={{ alignItems: 'flex-end' }}>
              <label>
                Asiento elegido
                <select value={asientoElegido} onChange={(e) => setAsientoElegido(e.target.value)}>
                  <option value="">-- Haz clic en un asiento verde --</option>
                  {asientosLibres.map((a) => (
                    <option key={a.id_asiento} value={a.id_asiento}>{a.codigo_asiento}</option>
                  ))}
                </select>
              </label>
              <label>
                Nombre completo
                <input value={nombrePasajero} onChange={(e) => setNombrePasajero(e.target.value)} placeholder="Ej: Juan Pérez" />
              </label>
              <label>
                Documento de identidad
                <input value={documentoPasajero} onChange={(e) => setDocumentoPasajero(e.target.value)} placeholder="Ej: 12345678" />
              </label>
              <button className="primario" onClick={agregarPasajero} disabled={!asientoElegido}>
                + Agregar
              </button>
            </div>

            {seleccionados.length === 0 ? (
              <EstadoVacio icono="💺" mensaje="Haz clic en un asiento verde y llena los datos del pasajero." />
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

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="secundario" onClick={() => { setPaso('viaje'); setError(''); }}>
                ← Volver
              </button>
              <button
                className="primario"
                disabled={seleccionados.length === 0 || cargando}
                onClick={continuarAPago}
              >
                {cargando ? 'Procesando...' : `Continuar al pago (${seleccionados.length} pasajero(s))`}
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 3: Pago ── */}
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
                <img
                  src="/qr-pago.png"
                  alt="QR de pago - Banco Económico"
                  style={{ width: 220, height: 220, objectFit: 'contain', borderRadius: 8 }}
                />
                <p style={{ margin: '0.5rem 0 0', color: '#b8a890', fontSize: '0.82rem' }}>
                  Monto: <strong style={{ color: 'var(--amarillo)' }}>Bs {Number(compra.monto_total).toLocaleString('es-BO')}</strong>
                </p>
                <small>Escanea con tu app bancaria y pagá el monto exacto</small>
              </div>
            )}

            {metodoPago === 'transferencia' && (
              <div className="tarjeta" style={{ marginBottom: '1rem' }}>
                <p><strong>Banco:</strong> Banco Económico</p>
                <p><strong>Titular:</strong> Lecaro Quispe Angel Emanuel</p>
                <p><strong>Cuenta:</strong> CA 1011027598</p>
                <p><strong>Referencia:</strong> {compra.codigo_venta}</p>
              </div>
            )}

            {metodoPago && (
              <button className="primario" onClick={confirmarPago} disabled={procesandoPago}>
                {procesandoPago
                  ? 'Procesando con la pasarela...'
                  : metodoPago === 'qr' ? 'Ya escaneé y pagué, confirmar' : 'Ya transferí, confirmar pago'}
              </button>
            )}
            {procesandoPago && <Spinner texto="Verificando pago..." />}

            <button
              className="secundario"
              style={{ marginTop: '0.75rem' }}
              onClick={() => { setPaso('pasajeros'); setError(''); }}
              disabled={procesandoPago}
            >
              ← Volver
            </button>
          </div>
        )}

        {/* ── PASO 4: Confirmación ── */}
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
