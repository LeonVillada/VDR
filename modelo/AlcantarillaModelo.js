const conexion = require('../database/conexion');

class AlcantarillaModelo {

    // ── ALCANTARILLAS ──────────────────────────────────────────
    static async crear(datos) {
        const { nombre, fecha, precio_boleta, costo_premio, tope_por_persona } = datos;
        const [result] = await conexion.query(
            `INSERT INTO alcantarillas (nombre, fecha, precio_boleta, costo_premio, tope_por_persona)
             VALUES (?, ?, ?, ?, ?)`,
            [nombre, fecha, precio_boleta || 3000, costo_premio || 0, tope_por_persona || 10]
        );
        return result.insertId;
    }

    static async obtenerTodas() {
        const [rows] = await conexion.query(`
            SELECT a.*,
                COALESCE(SUM(v.unidades_vendidas), 0) AS total_unidades,
                COALESCE(SUM(v.monto_pagado), 0)      AS total_recaudado,
                COUNT(DISTINCT v.persona_id)           AS personas_registradas
            FROM alcantarillas a
            LEFT JOIN alcantarilla_ventas v ON v.alcantarilla_id = a.id
            GROUP BY a.id
            ORDER BY a.fecha DESC
        `);
        return rows;
    }

    static async obtenerPorId(id) {
        const [rows] = await conexion.query('SELECT * FROM alcantarillas WHERE id = ?', [id]);
        return rows[0];
    }

    static async actualizar(id, datos) {
        const { nombre, fecha, precio_boleta, costo_premio, tope_por_persona, estado } = datos;
        await conexion.query(
            `UPDATE alcantarillas SET nombre=?, fecha=?, precio_boleta=?, costo_premio=?, tope_por_persona=?, estado=? WHERE id=?`,
            [nombre, fecha, precio_boleta, costo_premio, tope_por_persona, estado, id]
        );
    }

    static async eliminar(id) {
        await conexion.query('DELETE FROM alcantarillas WHERE id = ?', [id]);
    }

    // ── VENTAS POR PERSONA ─────────────────────────────────────
    static async registrarVenta(datos) {
        const { alcantarilla_id, persona_id, unidades_vendidas, monto_pagado } = datos;
        const [result] = await conexion.query(
            `INSERT INTO alcantarilla_ventas (alcantarilla_id, persona_id, unidades_vendidas, monto_pagado)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               unidades_vendidas = VALUES(unidades_vendidas),
               monto_pagado      = VALUES(monto_pagado)`,
            [alcantarilla_id, persona_id, unidades_vendidas, monto_pagado]
        );
        return result;
    }

    static async obtenerVentasPorAlcantarilla(alcantarilla_id) {
        const [rows] = await conexion.query(`
            SELECT v.*, p.nombre AS persona_nombre
            FROM alcantarilla_ventas v
            JOIN personas p ON p.id = v.persona_id
            WHERE v.alcantarilla_id = ?
            ORDER BY p.nombre ASC
        `, [alcantarilla_id]);
        return rows;
    }

    static async eliminarVenta(id) {
        await conexion.query('DELETE FROM alcantarilla_ventas WHERE id = ?', [id]);
    }

    // ── ESTADÍSTICAS ───────────────────────────────────────────
    static async obtenerEstadisticas() {
        // Recaudo real de ventas
        const [ventas] = await conexion.query(`
            SELECT COALESCE(SUM(monto_pagado), 0) AS total_recaudado
            FROM alcantarilla_ventas
        `);

        // Premios: UNO por alcantarilla (no multiplied by personas)
        const [premios] = await conexion.query(`
            SELECT
                COUNT(*) AS total_alcantarillas,
                COALESCE(SUM(costo_premio), 0) AS total_premios
            FROM alcantarillas
        `);

        // Personas activas en el sistema
        const [personas] = await conexion.query(`SELECT COUNT(*) AS total FROM personas`);

        const BOLETAS = 10;
        const PRECIO  = 3000;
        const META_PP = BOLETAS * PRECIO;  // $30.000 por persona por alcantarilla

        const recaudado   = Number(ventas[0].total_recaudado);
        const premioTotal = Number(premios[0].total_premios);
        const numAlc      = Number(premios[0].total_alcantarillas);
        const numPersonas = Number(personas[0].total);

        // Proyección: si todos pagan en todas las alcantarillas activas
        const esperado = numPersonas * META_PP * numAlc;

        return {
            total_alcantarillas: numAlc,
            total_recaudado:     recaudado,
            total_premios:       premioTotal,
            ganancia_neta:       recaudado - premioTotal,
            ganancia_proyectada: esperado  - premioTotal  // 450.000 - 100.000 = 350.000
        };
    }
}

module.exports = AlcantarillaModelo;
