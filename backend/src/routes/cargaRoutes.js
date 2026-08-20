// ============================================
// Rutas: Envíos de Carga
// ============================================

import express from 'express';
import * as cargaController from '../controllers/cargaController.js';
import { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.post('/envios', requirePermission(['operaciones:crear_envio']), cargaController.crearEnvio);
router.get('/envios', requirePermission(['operaciones:ver_dashboard', 'reportes:carga']), cargaController.listarEnvios);
router.get('/envios/:id', requirePermission(['operaciones:ver_dashboard', 'reportes:carga']), cargaController.obtenerEnvio);
router.patch('/envios/:id/estado', requirePermission(['operaciones:crear_envio']), cargaController.cambiarEstadoEnvio);

export default router;
