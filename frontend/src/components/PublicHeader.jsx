import { Link } from 'react-router-dom';
import logo from '../assets/logo-ferroviaria.svg';
import './PublicHeader.css';

export default function PublicHeader() {
  return (
    <header className="public-header">
      <Link to="/comprar" className="public-brand">
        <img src={logo} alt="Ferroviaria Oriental" />
        <span>Ferroviaria Oriental</span>
      </Link>
      <Link to="/login" className="public-staff-link">Soy personal de la empresa</Link>
    </header>
  );
}
