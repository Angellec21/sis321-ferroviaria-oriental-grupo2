import { useEffect, useState } from 'react';
import api from '../api/client';
import Spinner from '../components/Spinner';
import EstadoVacio from '../components/EstadoVacio';
import { useAuth } from '../context/AuthContext';

const ESTADOS = ['registrado', 'en_transito', 'entregado', 'cancelado'];
const ETIQUETA_ESTADO = {
  registrado: 'Registrado',
  en_transito: 'En tránsito',
  entregado: 'Entregado',
  cancelado: 'Cancelado'
};

export default function Envios() {
  const { tienePermiso } = useAuth();
  const [envios, setEnvios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarEnvios = () => {
    setCargando(true);
    api.get('/carga/envios')
      .then((r) => setEnvios(r.data.data))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarEnvios();
  }, []);

  const cambiarEstado = async (idEnvio, nuevoEstado) => {
    setError('');
    try {
      await api.patch(`/carga/envios/${idEnvio}/estado`, { estado_envio: nuevoEstado });
      setEnvios((prev) => prev.map((e) => (e.id_envio === idEnvio ? { ...e, estado_envio: nuevoEstado } : e)));
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar el estado');
    }
  };

  return (
    <div>
      <h2>📦 Envíos de Carga</h2>
      {error && <div className="error-msg">{error}</div>}

      {cargando ? <Spinner /> : envios.length === 0 ? (
        <EstadoVacio icono="📦" mensaje="No hay envíos de carga registrados todavía." />
      ) : (
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>Código</th><th>Ruta</th><th>Vagón</th><th>Remitente</th><th>Destinatario</th>
                <th>Peso</th><th>Estado</th><th>Registrado por</th>{tienePermiso('operaciones:crear_envio') && <th></th>}
              </tr>
            </thead>
            <tbody>
              {envios.map((e) => (
                <tr key={e.id_envio}>
                  <td>{e.codigo_envio}</td>
                  <td>{e.ruta}</td>
                  <td>{e.codigo_wagon}</td>
                  <td>{e.remitente}</td>
                  <td>{e.destinatario}</td>
                  <td>{Number(e.peso_kg).toLocaleString('es-BO')} kg</td>
                  <td>
                    <span className={`badge badge-${e.estado_envio}`}>{ETIQUETA_ESTADO[e.estado_envio] || e.estado_envio}</span>
                  </td>
                  <td>{e.registrado_por || '—'}</td>
                  {tienePermiso('operaciones:crear_envio') && (
                    <td>
                      <select
                        value={e.estado_envio}
                        onChange={(ev) => cambiarEstado(e.id_envio, ev.target.value)}
                        disabled={e.estado_envio === 'entregado' || e.estado_envio === 'cancelado'}
                      >
                        {ESTADOS.map((s) => (
                          <option key={s} value={s}>{ETIQUETA_ESTADO[s]}</option>
                        ))}
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
