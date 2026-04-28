const express = require('express');
const router = express.Router();
const EventosModelo = require('../modelo/EventosModelo');

// ── EVENTOS ──────────────────────────────────────────────────

// Obtener todos los eventos
router.get('/', async (req, res) => {
    try {
        const eventos = await EventosModelo.obtenerTodos();
        res.json(eventos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los eventos' });
    }
});

// Estadísticas generales
router.get('/estadisticas', async (req, res) => {
    try {
        const stats = await EventosModelo.obtenerEstadisticas();
        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// Obtener evento por ID (con recaudos y gastos)
router.get('/:id', async (req, res) => {
    try {
        const evento = await EventosModelo.obtenerPorId(req.params.id);
        if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
        res.json(evento);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el evento' });
    }
});

// Crear evento
router.post('/', async (req, res) => {
    try {
        const id = await EventosModelo.crear(req.body);
        res.status(201).json({ id, message: 'Evento creado exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear el evento' });
    }
});

// Actualizar evento
router.put('/:id', async (req, res) => {
    try {
        await EventosModelo.actualizar(req.params.id, req.body);
        res.json({ message: 'Evento actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el evento' });
    }
});

// Eliminar evento
router.delete('/:id', async (req, res) => {
    try {
        await EventosModelo.eliminar(req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el evento' });
    }
});

// ── RECAUDOS ─────────────────────────────────────────────────

// Registrar recaudo
router.post('/:id/recaudos', async (req, res) => {
    try {
        const recaudoId = await EventosModelo.registrarRecaudo({
            evento_id: req.params.id,
            ...req.body
        });
        res.status(201).json({ id: recaudoId, message: 'Recaudo registrado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar recaudo' });
    }
});

// Registrar recaudos masivos
router.post('/:id/recaudos-masivo', async (req, res) => {
    try {
        const evento_id = req.params.id;
        const { recaudos } = req.body; // [{ persona, monto, fecha_pago, notas }]
        const registrados = await EventosModelo.registrarRecaudosMasivo(
            recaudos.map(r => ({ ...r, evento_id }))
        );
        res.status(201).json({ registrados, message: `${registrados} recaudos registrados` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar recaudos masivos' });
    }
});

// Eliminar recaudo
router.delete('/recaudos/:id', async (req, res) => {
    try {
        await EventosModelo.eliminarRecaudo(req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar recaudo' });
    }
});

// ── GASTOS DEL EVENTO ────────────────────────────────────────

// Registrar gasto del evento
router.post('/:id/gastos', async (req, res) => {
    try {
        const gastoId = await EventosModelo.registrarGasto({
            evento_id: req.params.id,
            ...req.body
        });
        res.status(201).json({ id: gastoId, message: 'Gasto registrado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar gasto del evento' });
    }
});

// Eliminar gasto del evento
router.delete('/gastos/:id', async (req, res) => {
    try {
        await EventosModelo.eliminarGasto(req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar gasto del evento' });
    }
});

module.exports = router;
