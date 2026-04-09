const express = require('express');
const router  = express.Router();
const ctrl    = require('../controlador/PrestamoControlador');

// Rutas de préstamos
router.get('/estadisticas',     ctrl.obtenerEstadisticas);    // debe ir ANTES de /:id
router.get('/',                 ctrl.obtenerPrestamos);
router.get('/:id',              ctrl.obtenerPorId);
router.post('/',                ctrl.crearPrestamo);
router.put('/:id',              ctrl.actualizarPrestamo);
router.delete('/:id',           ctrl.eliminarPrestamo);

// Rutas de abonos
router.post('/:id/abonos',      ctrl.registrarAbono);
router.delete('/abonos/:id',    ctrl.eliminarAbono);

module.exports = router;
