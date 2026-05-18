const express = require('express');
const router = express.Router();
const pagoCtrl = require('../controlador/PagoControlador');

// Rutas para Pagos
router.get('/', pagoCtrl.obtenerPagos);
router.get('/persona/:persona_id', pagoCtrl.obtenerPagosPorPersona);
router.post('/', pagoCtrl.registrarPago);
router.delete('/:id', pagoCtrl.eliminarPago);
router.post('/global', pagoCtrl.registrarPagoGlobal);
router.post('/lote', pagoCtrl.registrarLote);
router.get('/estadisticas', pagoCtrl.obtenerEstadisticas);
router.post('/poner-al-dia/:persona_id', pagoCtrl.ponerAlDia);

module.exports = router;
