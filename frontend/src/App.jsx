import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ReporteIngresos from './pages/ReporteIngresos';
import ReporteOcupacion from './pages/ReporteOcupacion';
import ReporteMantenimiento from './pages/ReporteMantenimiento';
import Ventas from './pages/Ventas';
import NuevaVenta from './pages/NuevaVenta';
import DetalleVenta from './pages/DetalleVenta';
import Usuarios from './pages/Usuarios';
import ComprarPasaje from './pages/ComprarPasaje';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/comprar" element={<ComprarPasaje />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="reportes/ingresos" element={<ReporteIngresos />} />
            <Route path="reportes/ocupacion" element={<ReporteOcupacion />} />
            <Route path="reportes/mantenimiento" element={<ReporteMantenimiento />} />
            <Route path="ventas" element={<Ventas />} />
            <Route path="ventas/nueva" element={<NuevaVenta />} />
            <Route path="ventas/:id" element={<DetalleVenta />} />
            <Route path="usuarios" element={<Usuarios />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
