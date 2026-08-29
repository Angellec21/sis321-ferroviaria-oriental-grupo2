// ============================================
// Rutas: Catálogo (estaciones, trenes, rutas, viajes)
// ============================================

import express from 'express';
import * as catalogoController from '../controllers/catalogoController.js';
import { requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.get('/roles', catalogoController.listarRoles);
router.get('/estaciones', catalogoController.listarEstaciones);
router.get('/trenes', catalogoController.listarTrenes);
router.get('/rutas', catalogoController.listarRutas);
router.get('/viajes', catalogoController.listarViajes);
router.get('/viajes/:id/asientos', catalogoController.asientosDisponiblesPorViaje);
router.get('/viajes/:id/vagones-carga', catalogoController.vagonesCargaDisponiblesPorViaje);

router.post('/estaciones', requirePermission(['catalogo:administrar']), catalogoController.crearEstacion);
router.post('/rutas', requirePermission(['catalogo:administrar']), catalogoController.crearRuta);
router.post('/viajes', requirePermission(['catalogo:administrar']), catalogoController.crearViaje);

export default router;
