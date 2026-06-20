// ============================================
// Aplicación Principal (Express)
// ============================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { pathToFileURL } from 'url';

// Importar configuración y rutas
import { testConnection, closePool } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import usuariosRoutes from './routes/usuariosRoutes.js';
import reportesRoutes from './routes/reportesRoutes.js';
import catalogoRoutes from './routes/catalogoRoutes.js';
import ventasRoutes from './routes/ventasRoutes.js';
import pagosRoutes from './routes/pagosRoutes.js';
import publicoRoutes from './routes/publicoRoutes.js';
import { authenticateToken } from './middleware/auth.js';

// Cargar variables de entorno
dotenv.config();

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARES DE SEGURIDAD
// ============================================
app.use(helmet()); // Seguridad HTTP headers
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true
})); // CORS

// ============================================
// MIDDLEWARES DE PARSEO
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ============================================
// MIDDLEWARE DE LOGGING
// ============================================
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ============================================
// RUTAS PÚBLICAS
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API DSS Ferroviaria está funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Documentation
app.get('/api', (req, res) => {
  res.json({
    message: 'DSS Ferroviaria Oriental - API v1.0',
    version: process.env.APP_VERSION,
    endpoints: {
      auth: '/api/auth (POST /registro, /login, /refresh, /logout, GET /me)',
      public: '/api/public (sin login: GET /rutas, /viajes, /viajes/:id/asientos, POST /compras, POST /pagos, GET /compras/:codigo)',
      usuarios: '/api/usuarios (GET, GET/:id, PUT/:id, POST/:id/resetear-password, DELETE/:id)',
      catalogo: '/api/catalogo (GET /estaciones, /trenes, /rutas, /viajes, /viajes/:id/asientos)',
      reportes: '/api/reportes (GET /ingresos, /ocupacion, /mantenimiento)',
      ventas: '/api/ventas (POST /, GET /, GET /:id)',
      pagos: '/api/pagos (POST /, GET /)'
    }
  });
});

// ============================================
// RUTAS DE API
// ============================================

// Autenticación (público)
app.use('/api/auth', authRoutes);

// Compra pública sin registro (catálogo + venta + Pasarela de Pagos QR/Transferencia)
app.use('/api/public', publicoRoutes);

// Usuarios (requiere autenticación)
app.use('/api/usuarios', authenticateToken, usuariosRoutes);

// Catálogo (requiere autenticación)
app.use('/api/catalogo', authenticateToken, catalogoRoutes);

// Reportes - Query A, B, C (requiere autenticación + permisos)
app.use('/api/reportes', authenticateToken, reportesRoutes);

// Ventas y Reservas (requiere autenticación + permisos)
app.use('/api/ventas', authenticateToken, ventasRoutes);

// Pagos (requiere autenticación + permisos)
app.use('/api/pagos', authenticateToken, pagosRoutes);

// ============================================
// MANEJO DE ERRORES 404
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    code: 'NOT_FOUND',
    path: req.path
  });
});

// ============================================
// MANEJO GLOBAL DE ERRORES
// ============================================
app.use((err, req, res, next) => {
  console.error('[ERROR GLOBAL]', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    code: 'INTERNAL_ERROR'
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
async function iniciarServidor() {
  try {
    // Probar conexión a BD
    const bdConectada = await testConnection();
    if (!bdConectada) {
      console.error('❌ No se pudo conectar a la base de datos. Abortando inicio...');
      process.exit(1);
    }

    // Escuchar en puerto
    const servidor = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║  🚆 DSS FERROVIARIA ORIENTAL - API INICIADA           ║
║                                                        ║
║  📍 URL: http://localhost:${PORT}                      ║
║  🔌 Base de Datos: ${process.env.DB_NAME}            ║
║  🌍 Entorno: ${process.env.NODE_ENV}                  ║
║  📦 Versión: ${process.env.APP_VERSION}               ║
║                                                        ║
║  Endpoints:                                           ║
║  • POST   /api/auth/registro                         ║
║  • POST   /api/auth/login                            ║
║  • POST   /api/auth/logout                           ║
║  • GET    /api/auth/me                               ║
║  • GET    /api/usuarios                              ║
║  • GET    /api/usuarios/:id                          ║
║                                                        ║
║  Documentación: http://localhost:${PORT}/api          ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
      `);
    });

    // Manejo de señales para apagar gracefully
    process.on('SIGTERM', async () => {
      console.log('\n[SIGTERM] Cerrando servidor...');
      servidor.close(async () => {
        await closePool();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('\n[SIGINT] Cerrando servidor...');
      servidor.close(async () => {
        await closePool();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
}

// Iniciar si es ejecutado directamente
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  iniciarServidor();
}

export default app;
