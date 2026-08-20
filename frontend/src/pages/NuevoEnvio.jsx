import { useEffect, useState } from 'react';
import api from '../api/client';
import EstadoVacio from '../components/EstadoVacio';

export default function NuevoEnvio() {
  const [viajes, setViajes] = useState([]);
  const [vagonesCarga, setVagonesCarga] = useState([]);

  const [idViaje, setIdViaje] = useState('');
  const [idWagonCarga, setIdWagonCarga] = useState('');
  const [remitente, setRemitente] = useState('');
  const [destinatario, setDestinatario] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const [envioCreado, setEnvioCreado] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    api.get('/catalogo/viajes').then((r) => setViajes(r.data.data));
  }, []);

  useEffect(() => {
    if (idViaje) {
      api.get(`/catalogo/viajes/${idViaje}/vagones-carga`).then((r) => setVagonesCarga(r.data.data));
      setIdWagonCarga('');
    } else {
      setVagonesCarga([]);
    }
  }, [idViaje]);

  const vagonElegido = vagonesCarga.find((w) => String(w.id_wagon) === String(idWagonCarga));

  const registrarEnvio = async () => {
    setError('');
    if (!idViaje || !idWagonCarga || !remitente || !destinatario || !pesoKg) {
      setError('Completa viaje, vagón, remitente, destinatario y peso');
      return;
    }
    setCargando(true);
    try {
      const { data } = await api.post('/carga/envios', {
        id_viaje: Number(idViaje),
        id_wagon_carga: Number(idWagonCarga),
        remitente,
        destinatario,
        peso_kg: Number(pesoKg),
        descripcion_carga: descripcion || undefined
      });
      setEnvioCreado(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar el envío');
    } finally {
      setCargando(false);
    }
  };

  const registrarOtro = () => {
    setEnvioCreado(null);
    setRemitente('');
    setDestinatario('');
    setPesoKg('');
    setDescripcion('');
    setIdWagonCarga('');
    if (idViaje) {
      api.get(`/catalogo/viajes/${idViaje}/vagones-carga`).then((r) => setVagonesCarga(r.data.data));
    }
  };

  return (
    <div>
      <h2>📦 Nuevo Envío de Carga</h2>
      {error && <div className="error-msg">{error}</div>}

      {envioCreado ? (
        <div className="tarjeta-form" style={{ maxWidth: 420 }}>
          <h3>✅ Envío registrado — {envioCreado.codigo_envio}</h3>
          <p>Remitente: <strong>{envioCreado.remitente}</strong></p>
          <p>Destinatario: <strong>{envioCreado.destinatario}</strong></p>
          <p>Peso: <strong>{Number(envioCreado.peso_kg).toLocaleString('es-BO')} kg</strong></p>
          <p>Estado: <strong style={{ color: 'var(--amarillo)' }}>{envioCreado.estado_envio}</strong></p>
          <button className="primario" onClick={registrarOtro}>Registrar otro envío</button>
        </div>
      ) : (
        <>
          <div className="tarjeta-form">
            <h3>1. Viaje</h3>
            <div className="filtros">
              <label style={{ flex: '2 1 320px' }}>
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
              <h3>2. Vagón de carga</h3>
              {vagonesCarga.length === 0 ? (
                <EstadoVacio icono="🚃" mensaje="Este tren no tiene vagones de carga." />
              ) : (
                <div className="tabla-scroll">
                  <table>
                    <thead>
                      <tr><th></th><th>Vagón</th><th>Tipo de carga</th><th>Capacidad</th><th>Disponible</th></tr>
                    </thead>
                    <tbody>
                      {vagonesCarga.map((w) => (
                        <tr
                          key={w.id_wagon}
                          onClick={() => setIdWagonCarga(String(w.id_wagon))}
                          style={{ cursor: 'pointer', background: String(idWagonCarga) === String(w.id_wagon) ? 'rgba(245,224,60,0.08)' : 'transparent' }}
                        >
                          <td>
                            <input
                              type="radio"
                              checked={String(idWagonCarga) === String(w.id_wagon)}
                              onChange={() => setIdWagonCarga(String(w.id_wagon))}
                            />
                          </td>
                          <td>{w.codigo_wagon}</td>
                          <td>{w.tipo_carga || '—'}</td>
                          <td>{Number(w.capacidad_carga_kg).toLocaleString('es-BO')} kg</td>
                          <td style={{ color: Number(w.peso_disponible_kg) > 0 ? '#2ecc71' : '#e74c3c' }}>
                            {Number(w.peso_disponible_kg).toLocaleString('es-BO')} kg
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {idWagonCarga && (
            <div className="tarjeta-form">
              <h3>3. Datos del envío</h3>
              <div className="filtros">
                <label>
                  Remitente
                  <input value={remitente} onChange={(e) => setRemitente(e.target.value)} placeholder="Ej: Agroindustrias Warnes S.R.L." />
                </label>
                <label>
                  Destinatario
                  <input value={destinatario} onChange={(e) => setDestinatario(e.target.value)} placeholder="Ej: Distribuidora Yacuiba" />
                </label>
                <label>
                  Peso (kg)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={vagonElegido?.peso_disponible_kg}
                    value={pesoKg}
                    onChange={(e) => setPesoKg(e.target.value)}
                  />
                </label>
                <label style={{ flex: '2 1 260px' }}>
                  Descripción de la carga
                  <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Opcional" />
                </label>
              </div>
              {vagonElegido && (
                <p style={{ color: '#b8a890', fontSize: '0.85rem' }}>
                  Capacidad disponible en este vagón: <strong style={{ color: 'var(--amarillo)' }}>{Number(vagonElegido.peso_disponible_kg).toLocaleString('es-BO')} kg</strong>
                </p>
              )}
              <button className="primario" onClick={registrarEnvio} disabled={cargando}>
                {cargando ? 'Registrando...' : 'Registrar Envío'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
