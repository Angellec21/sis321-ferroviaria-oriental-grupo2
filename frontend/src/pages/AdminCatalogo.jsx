import { useEffect, useState } from 'react';
import api from '../api/client';
import Spinner from '../components/Spinner';

const TABS = ['estaciones', 'rutas', 'viajes'];
const ETIQUETAS = { estaciones: 'Estaciones', rutas: 'Rutas', viajes: 'Viajes' };

export default function AdminCatalogo() {
  const [tab, setTab] = useState('estaciones');
  const [estaciones, setEstaciones] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [trenes, setTrenes] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [formEstacion, setFormEstacion] = useState({ nombre: '', ciudad: '', departamento: '' });
  const [formRuta, setFormRuta] = useState({
    nombre: '', estacion_origen: '', estacion_destino: '', distancia_km: '',
    duracion_estimada_minutos: '', tarifa_adulto: '', tarifa_niño: '', tarifa_senior: ''
  });
  const [formViaje, setFormViaje] = useState({ id_ruta: '', id_tren: '', fecha_salida: '', fecha_llegada_estimada: '' });

  const cargarTodo = () => {
    setCargando(true);
    Promise.all([
      api.get('/catalogo/estaciones'),
      api.get('/catalogo/rutas'),
      api.get('/catalogo/trenes'),
      api.get('/catalogo/viajes')
    ]).then(([e, r, t, v]) => {
      setEstaciones(e.data.data);
      setRutas(r.data.data);
      setTrenes(t.data.data);
      setViajes(v.data.data);
    }).catch((err) => setError(err.response?.data?.message || 'Error al cargar el catálogo'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargarTodo(); }, []);

  const limpiarMensajes = () => { setError(''); setExito(''); };

  const crearEstacion = async (e) => {
    e.preventDefault();
    limpiarMensajes();
    try {
      await api.post('/catalogo/estaciones', formEstacion);
      setExito('Estación creada. Ya puedes usarla como origen/destino de una ruta.');
      setFormEstacion({ nombre: '', ciudad: '', departamento: '' });
      cargarTodo();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la estación');
    }
  };

  const crearRuta = async (e) => {
    e.preventDefault();
    limpiarMensajes();
    try {
      await api.post('/catalogo/rutas', {
        ...formRuta,
        estacion_origen: Number(formRuta.estacion_origen),
        estacion_destino: Number(formRuta.estacion_destino),
        distancia_km: Number(formRuta.distancia_km),
        duracion_estimada_minutos: Number(formRuta.duracion_estimada_minutos),
        tarifa_adulto: formRuta.tarifa_adulto ? Number(formRuta.tarifa_adulto) : undefined,
        tarifa_niño: formRuta.tarifa_niño ? Number(formRuta.tarifa_niño) : undefined,
        tarifa_senior: formRuta.tarifa_senior ? Number(formRuta.tarifa_senior) : undefined
      });
      setExito('Ruta creada. Ahora programa un viaje sobre ella para que aparezca en Comprar Pasaje / Nueva Venta.');
      setFormRuta({ nombre: '', estacion_origen: '', estacion_destino: '', distancia_km: '', duracion_estimada_minutos: '', tarifa_adulto: '', tarifa_niño: '', tarifa_senior: '' });
      cargarTodo();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la ruta');
    }
  };

  const crearViaje = async (e) => {
    e.preventDefault();
    limpiarMensajes();
    try {
      await api.post('/catalogo/viajes', {
        ...formViaje,
        id_ruta: Number(formViaje.id_ruta),
        id_tren: Number(formViaje.id_tren)
      });
      setExito('¡Viaje programado! Ya está disponible para la venta.');
      setFormViaje({ id_ruta: '', id_tren: '', fecha_salida: '', fecha_llegada_estimada: '' });
      cargarTodo();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al programar el viaje');
    }
  };

  return (
    <div>
      <h2>🗺️ Catálogo — Estaciones, Rutas y Viajes</h2>
      {error && <div className="error-msg">{error}</div>}
      {exito && <div className="exito-msg">{exito}</div>}

      <div className="pasos-compra" style={{ marginBottom: '1rem' }}>
        {TABS.map((t) => (
          <span key={t} className={t === tab ? 'paso-activo' : ''} style={{ cursor: 'pointer' }} onClick={() => { setTab(t); limpiarMensajes(); }}>
            {ETIQUETAS[t]}
          </span>
        ))}
      </div>

      {cargando ? <Spinner /> : (
        <>
          {tab === 'estaciones' && (
            <>
              <div className="tarjeta-form">
                <h3>+ Nueva Estación</h3>
                <p style={{ color: '#b8a890', fontSize: '0.85rem', marginTop: 0 }}>
                  Solo hace falta si el destino es una ciudad que todavía no tiene estación.
                </p>
                <form onSubmit={crearEstacion} className="filtros">
                  <label>
                    Nombre
                    <input required value={formEstacion.nombre} onChange={(e) => setFormEstacion({ ...formEstacion, nombre: e.target.value })} placeholder="Ej: Puerto Suárez - Terminal" />
                  </label>
                  <label>
                    Ciudad
                    <input required value={formEstacion.ciudad} onChange={(e) => setFormEstacion({ ...formEstacion, ciudad: e.target.value })} placeholder="Ej: Puerto Suárez" />
                  </label>
                  <label>
                    Departamento
                    <input value={formEstacion.departamento} onChange={(e) => setFormEstacion({ ...formEstacion, departamento: e.target.value })} placeholder="Opcional" />
                  </label>
                  <button className="primario" type="submit">Crear estación</button>
                </form>
              </div>
              <div className="tabla-scroll">
                <table>
                  <thead><tr><th>Nombre</th><th>Ciudad</th></tr></thead>
                  <tbody>
                    {estaciones.map((e) => (
                      <tr key={e.id_estacion}><td>{e.nombre}</td><td>{e.ciudad}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'rutas' && (
            <>
              <div className="tarjeta-form">
                <h3>+ Nueva Ruta</h3>
                <form onSubmit={crearRuta} className="filtros" style={{ flexWrap: 'wrap' }}>
                  <label>
                    Nombre
                    <input required value={formRuta.nombre} onChange={(e) => setFormRuta({ ...formRuta, nombre: e.target.value })} placeholder="Ej: Santa Cruz - Puerto Suárez" />
                  </label>
                  <label>
                    Origen
                    <select required value={formRuta.estacion_origen} onChange={(e) => setFormRuta({ ...formRuta, estacion_origen: e.target.value })}>
                      <option value="">Seleccionar...</option>
                      {estaciones.map((e) => <option key={e.id_estacion} value={e.id_estacion}>{e.nombre}</option>)}
                    </select>
                  </label>
                  <label>
                    Destino
                    <select required value={formRuta.estacion_destino} onChange={(e) => setFormRuta({ ...formRuta, estacion_destino: e.target.value })}>
                      <option value="">Seleccionar...</option>
                      {estaciones.map((e) => <option key={e.id_estacion} value={e.id_estacion}>{e.nombre}</option>)}
                    </select>
                  </label>
                  <label>
                    Distancia (km)
                    <input required type="number" min="1" value={formRuta.distancia_km} onChange={(e) => setFormRuta({ ...formRuta, distancia_km: e.target.value })} />
                  </label>
                  <label>
                    Duración (minutos)
                    <input required type="number" min="1" value={formRuta.duracion_estimada_minutos} onChange={(e) => setFormRuta({ ...formRuta, duracion_estimada_minutos: e.target.value })} />
                  </label>
                  <label>
                    Tarifa adulto (Bs)
                    <input type="number" min="0" value={formRuta.tarifa_adulto} onChange={(e) => setFormRuta({ ...formRuta, tarifa_adulto: e.target.value })} placeholder="60" />
                  </label>
                  <label>
                    Tarifa niño (Bs)
                    <input type="number" min="0" value={formRuta.tarifa_niño} onChange={(e) => setFormRuta({ ...formRuta, tarifa_niño: e.target.value })} placeholder="0" />
                  </label>
                  <label>
                    Tarifa senior (Bs)
                    <input type="number" min="0" value={formRuta.tarifa_senior} onChange={(e) => setFormRuta({ ...formRuta, tarifa_senior: e.target.value })} placeholder="0" />
                  </label>
                  <button className="primario" type="submit">Crear ruta</button>
                </form>
              </div>
              <div className="tabla-scroll">
                <table>
                  <thead><tr><th>Ruta</th><th>Distancia</th><th>Duración</th></tr></thead>
                  <tbody>
                    {rutas.map((r) => (
                      <tr key={r.id_ruta}>
                        <td>{r.nombre}</td>
                        <td>{Number(r.distancia_km).toFixed(0)} km</td>
                        <td>{Math.floor(r.duracion_estimada_minutos / 60)}h {r.duracion_estimada_minutos % 60}min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'viajes' && (
            <>
              <div className="tarjeta-form">
                <h3>+ Programar Viaje</h3>
                <p style={{ color: '#b8a890', fontSize: '0.85rem', marginTop: 0 }}>
                  Esto es lo que realmente aparece disponible en "Comprar Pasaje" y "Nueva Venta".
                </p>
                <form onSubmit={crearViaje} className="filtros" style={{ flexWrap: 'wrap' }}>
                  <label>
                    Ruta
                    <select required value={formViaje.id_ruta} onChange={(e) => setFormViaje({ ...formViaje, id_ruta: e.target.value })}>
                      <option value="">Seleccionar...</option>
                      {rutas.map((r) => <option key={r.id_ruta} value={r.id_ruta}>{r.nombre}</option>)}
                    </select>
                  </label>
                  <label>
                    Locomotora
                    <select required value={formViaje.id_tren} onChange={(e) => setFormViaje({ ...formViaje, id_tren: e.target.value })}>
                      <option value="">Seleccionar...</option>
                      {trenes.map((t) => <option key={t.id_tren} value={t.id_tren}>{t.codigo_tren}</option>)}
                    </select>
                  </label>
                  <label>
                    Fecha y hora de salida
                    <input required type="datetime-local" value={formViaje.fecha_salida} onChange={(e) => setFormViaje({ ...formViaje, fecha_salida: e.target.value })} />
                  </label>
                  <label>
                    Fecha y hora de llegada estimada
                    <input required type="datetime-local" value={formViaje.fecha_llegada_estimada} onChange={(e) => setFormViaje({ ...formViaje, fecha_llegada_estimada: e.target.value })} />
                  </label>
                  <button className="primario" type="submit">Programar viaje</button>
                </form>
              </div>
              <div className="tabla-scroll">
                <table>
                  <thead><tr><th>Código</th><th>Ruta</th><th>Salida</th><th>Estado</th></tr></thead>
                  <tbody>
                    {viajes.map((v) => (
                      <tr key={v.id_viaje}>
                        <td>{v.codigo_viaje}</td>
                        <td>{v.ruta}</td>
                        <td>{new Date(v.fecha_salida).toLocaleString('es-BO')}</td>
                        <td>{v.estado_viaje}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
