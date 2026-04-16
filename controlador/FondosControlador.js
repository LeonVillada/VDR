const express = require('express');
const router = express.Router();
const FondosModelo = require('../modelo/FondosModelo');

// Obtener todos los fondos
router.get('/', async (req, res) => {
    try {
        const fondos = await FondosModelo.obtenerTodos();
        res.json(fondos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los fondos' });
    }
});

// Crear un nuevo fondo
router.post('/', async (req, res) => {
    try {
        const nuevoFondo = req.body;
        const fondoCreado = await FondosModelo.crear(nuevoFondo);
        res.status(201).json(fondoCreado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear el fondo' });
    }
});

// Actualizar un fondo
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const datosActualizados = req.body;
        const fondoActualizado = await FondosModelo.actualizar(id, datosActualizados);
        res.json(fondoActualizado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el fondo' });
    }
});

// Eliminar un fondo
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await FondosModelo.eliminar(id);
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el fondo' });
    }
});

module.exports = router;