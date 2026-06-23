// ============================================
// Rutas Públicas: Compra de pasajes sin registro
// El cliente NO necesita cuenta. Solo navega el catálogo,
// elige asientos y paga vía la Pasarela de Pagos (QR/Transferencia).
// ============================================

import express from 'express';
import * as catalogoController from '../controllers/catalogoController.js';
import * as publicoController from '../controllers/publicoController.js';

const router = express.Router();

// Catálogo de solo lectura (sin autenticación)
router.get('/rutas', catalogoController.listarRutas);
router.get('/viajes', catalogoController.listarViajes);
router.get('/viajes/:id/asientos', catalogoController.asientosDisponiblesPorViaje);

// Compra y pago (Pasarela QR/Transferencia)
router.post('/compras', publicoController.crearCompra);
router.post('/pagos', publicoController.procesarPago);
router.get('/compras/:codigo', publicoController.obtenerCompraPorCodigo);

export default router;
