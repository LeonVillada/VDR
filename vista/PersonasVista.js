const express = require('express');
const router = express.Router();
const personaCtrl = require('../controlador/PersonasControlador');

// Rutas para Personas
router.get('/', personaCtrl.obtenerPersonas);
router.get('/:id', personaCtrl.obtenerPersonaPorId);
router.post('/', personaCtrl.crearPersona);
router.post('/masivo', personaCtrl.crearPersonasMasivo);
router.put('/:id', personaCtrl.actualizarPersona);
router.delete('/:id', personaCtrl.eliminarPersona);

module.exports = router;