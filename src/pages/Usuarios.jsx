import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

export default function Usuarios() {
  const { usuario: yo } = useAuth();
  const esAdmin = yo?.rol === 'administrador';
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [estaciones, setEstaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({
    nombre: '', email: '', documento_identidad: '', password: '', id_rol: '', id_estacion: ''
  });

  const cargarUsuarios = () => {
    api.get('/usuarios').then((r) => setUsuarios(r.data.data));
  };

  useEffect(() => {
    Promise.all([
      api.get('/usuarios'),
      api.get('/catalogo/roles'),
      api.get('/catalogo/estaciones')
    ]).then(([u, r, e]) => {
      setUsuarios(u.data.data);
      setRoles(r.data.data);
      setEstaciones(e.data.data);
    }).catch((err) => setError(err.response?.data?.message || 'Error al cargar usuarios'))
      .finally(() => setCargando(false));
  }, []);

  const crearUsuario = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');
    try {
      await api.post('/usuarios', {
        ...form,
        id_rol: Number(form.id_rol),
        id_estacion: form.id_estacion ? Number(form.id_estacion) : null
      });
      setExito('Usuario creado exitosamente');
      setForm({ nombre: '', email: '', documento_identidad: '', password: '', id_rol: '', id_estacion: '' });
      setMostrarForm(false);
      cargarUsuarios();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear usuario');
    }
  };

  const cambiarEstado = async (usuario) => {
    try {
      if (usuario.estado) {
        await api.delete(`/usuarios/${usuario.id_usuario}`);
      } else {
        await api.put(`/usuarios/${usuario.id_usuario}`, { estado: true });
      }
      cargarUsuarios();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar usuario');
    }
  };

  const resetearPassword = async (usuario) => {
    const nueva = window.prompt(`Nueva contraseña para ${usuario.nombre}:`);
    if (!nueva) return;
    try {
      await api.post(`/usuarios/${usuario.id_usuario}/resetear-password`, { nueva_password: nueva });
      setExito(`Contraseña reseteada para ${usuario.nombre}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al resetear contraseña');
    }
  };

  return (
    <div>
      <h2>👥 Gestión de Usuarios</h2>
      {error && <div className="error-msg">{error}</div>}
      {exito && <div className="exito-msg">{exito}</div>}

      {esAdmin && (
        <button className="primario" style={{ marginBottom: '1rem' }} onClick={() => setMostrarForm(!mostrarForm)}>
          {mostrarForm ? 'Cancelar' : '+ Nuevo Usuario'}
        </button>
      )}

      {esAdmin && mostrarForm && (
        <form onSubmit={crearUsuario} className="tarjeta-form filtros" style={{ flexWrap: 'wrap' }}>
          <label>
            Nombre
            <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </label>
          <label>
            Email
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            Documento
            <input required value={form.documento_identidad} onChange={(e) => setForm({ ...form, documento_identidad: e.target.value })} />
          </label>
          <label>
            Contraseña
            <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label>
            Rol
            <select required value={form.id_rol} onChange={(e) => setForm({ ...form, id_rol: e.target.value })}>
              <option value="">Seleccionar...</option>
              {roles.map((r) => <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>)}
            </select>
          </label>
          <label>
            Estación
            <select value={form.id_estacion} onChange={(e) => setForm({ ...form, id_estacion: e.target.value })}>
              <option value="">Sin estación</option>
              {estaciones.map((e2) => <option key={e2.id_estacion} value={e2.id_estacion}>{e2.nombre}</option>)}
            </select>
          </label>
          <button className="primario" type="submit">Crear</button>
        </form>
      )}

      {cargando ? <Spinner /> : (
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estación</th><th>Estado</th><th>Último login</th>{esAdmin && <th></th>}</tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario}>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td>{u.rol_nombre}</td>
                  <td>{u.estacion_nombre || '—'}</td>
                  <td>{u.estado ? '✅ Activo' : '⛔ Inactivo'}</td>
                  <td>{u.ultimo_login ? new Date(u.ultimo_login).toLocaleString('es-BO') : 'Nunca'}</td>
                  {esAdmin && (
                    <td style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => resetearPassword(u)}>Resetear pass</button>
                      <button onClick={() => cambiarEstado(u)}>{u.estado ? 'Desactivar' : 'Activar'}</button>
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
