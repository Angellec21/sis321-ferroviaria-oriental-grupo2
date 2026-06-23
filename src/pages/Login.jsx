import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo-ferroviaria.svg';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('admin@ferroviariaoriental.com.bo');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <img src={logo} alt="Ferroviaria Oriental" className="login-logo" />
        <h1>DSS Ferroviaria Oriental</h1>
        <p className="subtitulo">Sistema de Apoyo a la Toma de Decisiones</p>

        {error && <div className="error-msg">{error}</div>}

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button className="primario" type="submit" disabled={cargando}>
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>

        <p className="ayuda">Admin: admin@ferroviariaoriental.com.bo / admin123</p>

        <Link to="/comprar" style={{ fontSize: '0.85rem', textAlign: 'center' }}>
          ¿Quieres comprar un pasaje? Compra aquí sin crear cuenta →
        </Link>
      </form>
    </div>
  );
}
