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
import Envios from './pages/Envios';
import NuevoEnvio from './pages/NuevoEnvio';
import AdminCatalogo from './pages/AdminCatalogo';

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
            <Route path="carga" element={<Envios />} />
            <Route path="carga/nuevo" element={<NuevoEnvio />} />
            <Route path="catalogo" element={<AdminCatalogo />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
