const AlcantarillaModelo = require('../modelo/AlcantarillaModelo');

// ── ALCANTARILLAS ──────────────────────────────────────────────
const obtenerAlcantarillas = async (req, res) => {
    try {
        const data = await AlcantarillaModelo.obtenerTodas();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const crearAlcantarilla = async (req, res) => {
    try {
        const id = await AlcantarillaModelo.crear(req.body);
        res.status(201).json({ mensaje: 'Alcantarilla creada', id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const actualizarAlcantarilla = async (req, res) => {
    try {
        await AlcantarillaModelo.actualizar(req.params.id, req.body);
        res.json({ mensaje: 'Alcantarilla actualizada' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const eliminarAlcantarilla = async (req, res) => {
    try {
        await AlcantarillaModelo.eliminar(req.params.id);
        res.json({ mensaje: 'Alcantarilla eliminada' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const obtenerEstadisticas = async (req, res) => {
    try {
        const stats = await AlcantarillaModelo.obtenerEstadisticas();
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// ── VENTAS ─────────────────────────────────────────────────────
const obtenerVentas = async (req, res) => {
    try {
        const ventas = await AlcantarillaModelo.obtenerVentasPorAlcantarilla(req.params.id);
        res.json(ventas);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const registrarVenta = async (req, res) => {
    try {
        const { alcantarilla_id, persona_id, unidades_vendidas } = req.body;

        // Validar tope
        const alcantarilla = await AlcantarillaModelo.obtenerPorId(alcantarilla_id);
        if (!alcantarilla) return res.status(404).json({ error: 'Alcantarilla no encontrada' });

        if (unidades_vendidas > alcantarilla.tope_por_persona) {
            return res.status(400).json({
                error: `La cantidad máxima permitida es ${alcantarilla.tope_por_persona} unidades por persona.`
            });
        }

        const monto_pagado = unidades_vendidas * alcantarilla.precio_boleta;
        await AlcantarillaModelo.registrarVenta({ alcantarilla_id, persona_id, unidades_vendidas, monto_pagado });
        res.status(201).json({ mensaje: 'Venta registrada', monto_pagado });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const eliminarVenta = async (req, res) => {
    try {
        await AlcantarillaModelo.eliminarVenta(req.params.id);
        res.json({ mensaje: 'Venta eliminada' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    obtenerAlcantarillas,
    crearAlcantarilla,
    actualizarAlcantarilla,
    eliminarAlcantarilla,
    obtenerEstadisticas,
    obtenerVentas,
    registrarVenta,
    eliminarVenta
};
