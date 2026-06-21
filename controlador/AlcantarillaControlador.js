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
        const datos = { ...req.body };
        if (req.file) datos.comprobante_premio = req.file.filename;

        // Convertir strings numéricos de form-data
        if (datos.precio_boleta)    datos.precio_boleta    = Number(datos.precio_boleta);
        if (datos.costo_premio)     datos.costo_premio     = Number(datos.costo_premio);
        if (datos.tope_por_persona) datos.tope_por_persona = Number(datos.tope_por_persona) || 15;

        const id = await AlcantarillaModelo.crear(datos);
        res.status(201).json({ mensaje: 'Alcantarilla creada', id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const actualizarAlcantarilla = async (req, res) => {
    try {
        const datos = { ...req.body };
        if (req.file) datos.comprobante_premio = req.file.filename;

        // Convertir strings numéricos
        if (datos.precio_boleta) datos.precio_boleta = Number(datos.precio_boleta);
        if (datos.costo_premio) datos.costo_premio = Number(datos.costo_premio);
        if (datos.tope_por_persona) datos.tope_por_persona = Number(datos.tope_por_persona);

        await AlcantarillaModelo.actualizar(req.params.id, datos);
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
        const { alcantarilla_id, persona_id, monto_pagado, unidades_vendidas } = req.body;

        // Validar que exista la alcantarilla
        const alcantarilla = await AlcantarillaModelo.obtenerPorId(alcantarilla_id);
        if (!alcantarilla) return res.status(404).json({ error: 'Alcantarilla no encontrada' });

        // monto_pagado es el valor real ingresado; si no viene, calcular desde unidades
        const montoPagadoFinal = monto_pagado !== undefined
            ? Number(monto_pagado)
            : Number(unidades_vendidas || 0) * Number(alcantarilla.precio_boleta);

        // Boletas estimadas (para registrar en unidades_vendidas)
        const unidadesFinales = unidades_vendidas !== undefined
            ? Number(unidades_vendidas)
            : (Number(alcantarilla.precio_boleta) > 0
                ? Math.round(montoPagadoFinal / Number(alcantarilla.precio_boleta))
                : 0);

        await AlcantarillaModelo.registrarVenta({
            alcantarilla_id,
            persona_id,
            unidades_vendidas: unidadesFinales,
            monto_pagado:      montoPagadoFinal
        });
        res.status(201).json({ mensaje: 'Venta registrada', monto_pagado: montoPagadoFinal });
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
