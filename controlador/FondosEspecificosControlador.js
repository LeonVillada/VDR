const express = require('express');
const router = express.Router();
const FondosEspecificosModelo = require('../modelo/FondosEspecificosModelo');

// Obtener todos los fondos específicos
router.get('/', async (req, res) => {
    try {
        const fondosEspecificos = await FondosEspecificosModelo.obtenerTodos();
        res.json(fondosEspecificos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los fondos específicos' });
    }
});

// Crear un nuevo fondo específico
router.post('/', async (req, res) => {
    try {
        const nuevoFondoEspecifico = req.body;
        const fondoEspecificoCreado = await FondosEspecificosModelo.crear(nuevoFondoEspecifico);
        res.status(201).json(fondoEspecificoCreado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear el fondo específico' });
    }
});

// Actualizar un fondo específico
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const datosActualizados = req.body;
        const fondoEspecificoActualizado = await FondosEspecificosModelo.actualizar(id, datosActualizados);
        res.json(fondoEspecificoActualizado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el fondo específico' });
    }
});

// Eliminar un fondo específico
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await FondosEspecificosModelo.eliminar(id);
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el fondo específico' });
    }
});

module.exports = router;