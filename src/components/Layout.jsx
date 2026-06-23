import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo-ferroviaria.svg';
import UserMenu from './UserMenu';
import './Layout.css';

export default function Layout() {
  const { tienePermiso } = useAuth();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="marca">
          <img src={logo} alt="Ferroviaria Oriental" />
          <span>DSS<br />Ferroviaria Oriental</span>
        </div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          {tienePermiso('reportes:ingresos') && <NavLink to="/reportes/ingresos">Ingresos</NavLink>}
          {tienePermiso('reportes:ocupacion') && <NavLink to="/reportes/ocupacion">Ocupación</NavLink>}
          {tienePermiso('reportes:mantenimiento') && <NavLink to="/reportes/mantenimiento">Mantenimiento</NavLink>}
          {tienePermiso('operaciones:crear_venta') && <NavLink to="/ventas/nueva">Nueva Venta</NavLink>}
          <NavLink to="/ventas">Ventas</NavLink>
          {tienePermiso('usuarios:leer') && <NavLink to="/usuarios">Usuarios</NavLink>}
        </nav>
        <UserMenu />
      </aside>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
