const express = require('express');
const router  = express.Router();
const ctrl    = require('../controlador/AlcantarillaControlador');
const multer = require('multer');
const path   = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, 'alc-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Alcantarillas
router.get('/',           ctrl.obtenerAlcantarillas);
router.post('/',          upload.single('comprobante'), ctrl.crearAlcantarilla);
router.put('/:id',        upload.single('comprobante'), ctrl.actualizarAlcantarilla);
router.delete('/:id',     ctrl.eliminarAlcantarilla);
router.get('/estadisticas', ctrl.obtenerEstadisticas);

// Ventas por alcantarilla
router.get('/:id/ventas',  ctrl.obtenerVentas);
router.post('/ventas',     ctrl.registrarVenta);
router.delete('/ventas/:id', ctrl.eliminarVenta);

module.exports = router;
