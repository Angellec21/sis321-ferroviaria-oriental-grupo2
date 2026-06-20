// ============================================
// Rutas: Catálogo (estaciones, trenes, rutas, viajes)
// ============================================

import express from 'express';
import * as catalogoController from '../controllers/catalogoController.js';

const router = express.Router();

router.get('/roles', catalogoController.listarRoles);
router.get('/estaciones', catalogoController.listarEstaciones);
router.get('/trenes', catalogoController.listarTrenes);
router.get('/rutas', catalogoController.listarRutas);
router.get('/viajes', catalogoController.listarViajes);
router.get('/viajes/:id/asientos', catalogoController.asientosDisponiblesPorViaje);

export default router;
