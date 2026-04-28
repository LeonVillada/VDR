const db = require('../database/conexion');

const EventosModelo = {

    // ── EVENTOS ──────────────────────────────────────────────────

    obtenerTodos: async () => {
        const [eventos] = await db.query(`
            SELECT e.*,
                COALESCE(r.total_recaudado, 0) AS total_recaudado,
                COALESCE(r.num_pagos, 0) AS num_pagos,
                COALESCE(g.total_gastado, 0) AS total_gastado,
                COALESCE(g.num_gastos, 0) AS num_gastos,
                (COALESCE(r.total_recaudado, 0) - COALESCE(g.total_gastado, 0)) AS balance
            FROM eventos e
            LEFT JOIN (
                SELECT evento_id, SUM(monto) AS total_recaudado, COUNT(*) AS num_pagos
                FROM evento_recaudos GROUP BY evento_id
            ) r ON r.evento_id = e.id
            LEFT JOIN (
                SELECT evento_id, SUM(monto) AS total_gastado, COUNT(*) AS num_gastos
                FROM evento_gastos GROUP BY evento_id
            ) g ON g.evento_id = e.id
            ORDER BY e.fecha_evento DESC
        `);
        return eventos;
    },

    obtenerPorId: async (id) => {
        const [[evento]] = await db.query(`
            SELECT e.*,
                COALESCE(r.total_recaudado, 0) AS total_recaudado,
                COALESCE(r.num_pagos, 0) AS num_pagos,
                COALESCE(g.total_gastado, 0) AS total_gastado,
                COALESCE(g.num_gastos, 0) AS num_gastos,
                (COALESCE(r.total_recaudado, 0) - COALESCE(g.total_gastado, 0)) AS balance
            FROM eventos e
            LEFT JOIN (
                SELECT evento_id, SUM(monto) AS total_recaudado, COUNT(*) AS num_pagos
                FROM evento_recaudos GROUP BY evento_id
            ) r ON r.evento_id = e.id
            LEFT JOIN (
                SELECT evento_id, SUM(monto) AS total_gastado, COUNT(*) AS num_gastos
                FROM evento_gastos GROUP BY evento_id
            ) g ON g.evento_id = e.id
            WHERE e.id = ?
        `, [id]);

        if (!evento) return null;

        const [recaudos] = await db.query(
            'SELECT * FROM evento_recaudos WHERE evento_id = ? ORDER BY fecha_pago DESC', [id]
        );
        const [gastos] = await db.query(
            'SELECT * FROM evento_gastos WHERE evento_id = ? ORDER BY fecha_gasto DESC', [id]
        );

        return { ...evento, recaudos, gastos };
    },

    crear: async (datos) => {
        const { nombre, descripcion, fecha_evento, cuota_persona } = datos;
        const [result] = await db.query(
            'INSERT INTO eventos (nombre, descripcion, fecha_evento, cuota_persona) VALUES (?, ?, ?, ?)',
            [nombre, descripcion || null, fecha_evento, cuota_persona || 0]
        );
        return result.insertId;
    },

    actualizar: async (id, datos) => {
        const { nombre, descripcion, fecha_evento, estado, cuota_persona } = datos;
        await db.query(
            'UPDATE eventos SET nombre=?, descripcion=?, fecha_evento=?, estado=?, cuota_persona=? WHERE id=?',
            [nombre, descripcion, fecha_evento, estado, cuota_persona || 0, id]
        );
    },

    eliminar: async (id) => {
        await db.query('DELETE FROM eventos WHERE id = ?', [id]);
    },

    // ── RECAUDOS ─────────────────────────────────────────────────

    registrarRecaudo: async (datos) => {
        const { evento_id, persona, monto, fecha_pago, notas } = datos;
        const [result] = await db.query(
            'INSERT INTO evento_recaudos (evento_id, persona, monto, fecha_pago, notas) VALUES (?, ?, ?, ?, ?)',
            [evento_id, persona, monto, fecha_pago, notas || null]
        );
        return result.insertId;
    },

    eliminarRecaudo: async (id) => {
        await db.query('DELETE FROM evento_recaudos WHERE id = ?', [id]);
    },

    registrarRecaudosMasivo: async (recaudos) => {
        const filtrados = recaudos.filter(r => r.persona && Number(r.monto) > 0);
        if (filtrados.length === 0) return 0;
        const values = filtrados.map(r => [r.evento_id, r.persona, r.monto, r.fecha_pago, r.notas || null]);
        await db.query('INSERT INTO evento_recaudos (evento_id, persona, monto, fecha_pago, notas) VALUES ?', [values]);
        return filtrados.length;
    },

    // ── GASTOS DEL EVENTO ────────────────────────────────────────

    registrarGasto: async (datos) => {
        const { evento_id, concepto, monto, fecha_gasto, notas } = datos;
        const [result] = await db.query(
            'INSERT INTO evento_gastos (evento_id, concepto, monto, fecha_gasto, notas) VALUES (?, ?, ?, ?, ?)',
            [evento_id, concepto, monto, fecha_gasto, notas || null]
        );
        return result.insertId;
    },

    eliminarGasto: async (id) => {
        await db.query('DELETE FROM evento_gastos WHERE id = ?', [id]);
    },

    // ── ESTADÍSTICAS ─────────────────────────────────────────────

    obtenerEstadisticas: async () => {
        const [[stats]] = await db.query(`
            SELECT
                COUNT(*) AS total_eventos,
                SUM(CASE WHEN estado='planificado' THEN 1 ELSE 0 END) AS planificados,
                SUM(CASE WHEN estado='en_curso' THEN 1 ELSE 0 END) AS en_curso,
                SUM(CASE WHEN estado='finalizado' THEN 1 ELSE 0 END) AS finalizados,
                SUM(CASE WHEN estado='cancelado' THEN 1 ELSE 0 END) AS cancelados
            FROM eventos
        `);

        const [[financiero]] = await db.query(`
            SELECT
                COALESCE(SUM(r.total), 0) AS total_recaudado_global,
                COALESCE(SUM(g.total), 0) AS total_gastado_global
            FROM eventos e
            LEFT JOIN (SELECT evento_id, SUM(monto) AS total FROM evento_recaudos GROUP BY evento_id) r ON r.evento_id = e.id
            LEFT JOIN (SELECT evento_id, SUM(monto) AS total FROM evento_gastos GROUP BY evento_id) g ON g.evento_id = e.id
        `);

        return {
            total_eventos: Number(stats.total_eventos),
            planificados: Number(stats.planificados),
            en_curso: Number(stats.en_curso),
            finalizados: Number(stats.finalizados),
            cancelados: Number(stats.cancelados),
            total_recaudado_global: Number(financiero.total_recaudado_global),
            total_gastado_global: Number(financiero.total_gastado_global),
            balance_global: Number(financiero.total_recaudado_global) - Number(financiero.total_gastado_global)
        };
    }
};

module.exports = EventosModelo;
