const express = require('express');
const router = express.Router();
const pagoCtrl = require('../controlador/PagoControlador');

// Rutas para Pagos
router.get('/', pagoCtrl.obtenerPagos);
router.get('/persona/:persona_id', pagoCtrl.obtenerPagosPorPersona);
router.post('/', pagoCtrl.registrarPago);
router.delete('/:id', pagoCtrl.eliminarPago);
router.get('/estadisticas', pagoCtrl.obtenerEstadisticas);

module.exports = router;
