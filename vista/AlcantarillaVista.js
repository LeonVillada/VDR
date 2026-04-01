const express = require('express');
const router  = express.Router();
const ctrl    = require('../controlador/AlcantarillaControlador');

// Alcantarillas
router.get('/',           ctrl.obtenerAlcantarillas);
router.post('/',          ctrl.crearAlcantarilla);
router.put('/:id',        ctrl.actualizarAlcantarilla);
router.delete('/:id',     ctrl.eliminarAlcantarilla);
router.get('/estadisticas', ctrl.obtenerEstadisticas);

// Ventas por alcantarilla
router.get('/:id/ventas',  ctrl.obtenerVentas);
router.post('/ventas',     ctrl.registrarVenta);
router.delete('/ventas/:id', ctrl.eliminarVenta);

module.exports = router;
