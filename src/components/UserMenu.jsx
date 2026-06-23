import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export default function UserMenu() {
  const { usuario, logout } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const cerrarSiAfuera = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrarSiAfuera);
    return () => document.removeEventListener('mousedown', cerrarSiAfuera);
  }, []);

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-menu-trigger" onClick={() => setAbierto((a) => !a)}>
        <span className="avatar">{iniciales(usuario?.nombre)}</span>
        <span className="user-menu-nombre">{usuario?.nombre}</span>
        <span className="chevron">{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div className="user-menu-dropdown">
          <p className="nombre">{usuario?.nombre}</p>
          <p className="rol">{usuario?.rol}</p>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      )}
    </div>
  );
}
