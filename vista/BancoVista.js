const express = require('express');
const router  = express.Router();
const ctrl    = require('../controlador/BancoControlador');

router.get('/fondo-global',   ctrl.obtenerFondoGlobal);
router.get('/resumen-maestro', ctrl.obtenerResumenMaestro);

module.exports = router;
