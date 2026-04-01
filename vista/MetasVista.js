const express = require('express');
const router = express.Router();
const metaCtrl = require('../controlador/MetaControlador');

router.post('/', metaCtrl.crearMeta);
router.get('/', metaCtrl.obtenerEstadisticasMetas); // Obtiene con montos calculados por defecto
router.put('/:id', metaCtrl.actualizarMeta);
router.delete('/:id', metaCtrl.eliminarMeta);

module.exports = router;
