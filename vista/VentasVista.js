const express = require('express');
const router = express.Router();
const multer = require('multer');
const VentasControlador = require('../controlador/VentasControlador');

const upload = multer({ dest: 'uploads/' });

// Fondos: disponibilidad
router.get('/fondos-disponibilidad', VentasControlador.obtenerDisponibilidadFondos);

// Eventos
router.get('/', VentasControlador.obtenerEventos);
router.post('/', upload.array('archivos_consolidacion', 10), VentasControlador.crearEvento);
router.delete('/:id', VentasControlador.eliminarEvento);
router.put('/:id/estado', VentasControlador.cambiarEstadoEvento);

// Gastos (Presupuesto inicial)
router.get('/:evento_id/gastos', VentasControlador.obtenerGastosPorEvento);
router.post('/gastos', upload.single('comprobante_imagen'), VentasControlador.registrarGasto);
router.delete('/gastos/:id', VentasControlador.eliminarGasto);

// Asignaciones
router.get('/:evento_id/asignaciones', VentasControlador.obtenerAsignacionesPorEvento);
router.post('/:evento_id/asignaciones', VentasControlador.asignarIntegrantes);
router.delete('/asignaciones/:id', VentasControlador.eliminarAsignacion);

// Abonos
router.get('/:evento_id/abonos', VentasControlador.obtenerTodosLosAbonosPorEvento);
router.post('/abonos', upload.single('comprobante_transferencia'), VentasControlador.registrarAbono);
router.delete('/abonos/:id', VentasControlador.eliminarAbono);

// Cantidad Total Productos
router.put('/:id/cantidad', VentasControlador.actualizarCantidadProductos);

// Precio unitario de venta
router.put('/:id/precio', VentasControlador.actualizarPrecioUnitario);

module.exports = router;
