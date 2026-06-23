import { useEffect, useState } from 'react';
import api from '../api/client';
import EstadoVacio from '../components/EstadoVacio';

export default function NuevaVenta() {
  const [estaciones, setEstaciones] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [asientos, setAsientos] = useState([]);

  const [idEstacion, setIdEstacion] = useState('');
  const [idViaje, setIdViaje] = useState('');
  const [seleccionados, setSeleccionados] = useState([]);
  const [nombrePasajero, setNombrePasajero] = useState('');
  const [documentoPasajero, setDocumentoPasajero] = useState('');

  const [venta, setVenta] = useState(null);
  const [tipoPago, setTipoPago] = useState('qr');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    api.get('/catalogo/estaciones').then((r) => setEstaciones(r.data.data));
    api.get('/catalogo/viajes').then((r) => setViajes(r.data.data));
  }, []);

  useEffect(() => {
    if (idViaje) {
      api.get(`/catalogo/viajes/${idViaje}/asientos`).then((r) => setAsientos(r.data.data));
      setSeleccionados([]);
    } else {
      setAsientos([]);
    }
  }, [idViaje]);

  const agregarPasajero = () => {
    if (!nombrePasajero) return;
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

  const crearVenta = async () => {
    setError('');
    setCargando(true);
    try {
      const { data } = await api.post('/ventas', {
        id_estacion: Number(idEstacion),
        id_viaje: Number(idViaje),
        pasajeros: seleccionados
      });
      setVenta(data.data.venta);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la venta');
    } finally {
      setCargando(false);
    }
  };

  const registrarPago = async () => {
    setError('');
    setCargando(true);
    try {
      await api.post('/pagos', {
        id_venta: venta.id_venta,
        monto: venta.monto_total,
        tipo_pago: tipoPago,
        detalle_especifico: tipoPago === 'qr'
          ? { codigo_qr: `QR-${venta.codigo_venta}` }
          : tipoPago === 'transferencia'
            ? { numero_referencia_transferencia: `REF-${venta.codigo_venta}` }
            : { id_usuario_operador: 1, metodo_pago_local: 'efectivo' }
      });
      setExito(`Pago registrado para la venta ${venta.codigo_venta}. ¡Listo!`);
      setVenta(null);
      setIdViaje('');
      setSeleccionados([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar el pago');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <h2>🎫 Nueva Venta</h2>
      {error && <div className="error-msg">{error}</div>}
      {exito && <div className="exito-msg">{exito}</div>}

      {!venta && (
        <>
          <div className="tarjeta-form">
            <h3>1. Viaje y estación</h3>
            <div className="filtros">
              <label>
                Estación
                <select value={idEstacion} onChange={(e) => setIdEstacion(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {estaciones.map((e) => (
                    <option key={e.id_estacion} value={e.id_estacion}>{e.nombre}</option>
                  ))}
                </select>
              </label>
              <label>
                Viaje
                <select value={idViaje} onChange={(e) => setIdViaje(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {viajes.map((v) => (
                    <option key={v.id_viaje} value={v.id_viaje}>
                      {v.codigo_viaje} — {v.ruta} ({new Date(v.fecha_salida).toLocaleDateString('es-BO')})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {idViaje && (
            <div className="tarjeta-form">
              <h3>2. Pasajeros — {asientos.length - seleccionados.length} asiento(s) disponibles</h3>
              <div className="filtros">
                <label>
                  Nombre pasajero
                  <input value={nombrePasajero} onChange={(e) => setNombrePasajero(e.target.value)} />
                </label>
                <label>
                  Documento
                  <input value={documentoPasajero} onChange={(e) => setDocumentoPasajero(e.target.value)} />
                </label>
                <button className="primario" onClick={agregarPasajero}>+ Agregar pasajero</button>
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
                          <td>{s.documento_pasajero || '—'}</td>
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
                disabled={!idEstacion || seleccionados.length === 0 || cargando}
                onClick={crearVenta}
              >
                {cargando ? 'Creando...' : `Crear Venta (${seleccionados.length} pasajero(s))`}
              </button>
            </div>
          )}
        </>
      )}

      {venta && (
        <div className="tarjeta-form" style={{ maxWidth: 420 }}>
          <h3>3. Pago — Venta {venta.codigo_venta}</h3>
          <p>Monto total: <strong style={{ color: 'var(--amarillo)' }}>Bs {Number(venta.monto_total).toLocaleString('es-BO')}</strong></p>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
            Método de pago
            <select value={tipoPago} onChange={(e) => setTipoPago(e.target.value)}>
              <option value="qr">QR</option>
              <option value="transferencia">Transferencia</option>
              <option value="ventanilla">Ventanilla</option>
            </select>
          </label>

          <button className="primario" onClick={registrarPago} disabled={cargando}>
            {cargando ? 'Procesando...' : 'Registrar Pago'}
          </button>
        </div>
      )}
    </div>
  );
}
