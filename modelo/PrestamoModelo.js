const conexion = require('../database/conexion');

class PrestamoModelo {

    // ── PRÉSTAMOS ──────────────────────────────────────────────

    static async validarFuenteId(fuente_id) {
        const [[fuente]] = await conexion.query(
            `SELECT id FROM fondos WHERE id = ?`,
            [fuente_id]
        );
        return !!fuente; // Devuelve true si existe, false si no
    }

    static async obtenerFuenteCuotas() {
        const [[fondo]] = await conexion.query(
            `SELECT id FROM fondos WHERE nombre = 'cuotas'`
        );
        if (!fondo) {
            const [result] = await conexion.query(
                `INSERT INTO fondos (nombre) VALUES ('cuotas')`
            );
            return result.insertId;
        }
        return fondo.id;
    }

    // Resolver fuente_id: acepta nombre (string) o id (number)
    static async resolverFuenteId(fuente_id) {
        if (!fuente_id) return await this.obtenerFuenteCuotas();

        // Si ya es un número válido, usarlo directamente
        if (!isNaN(fuente_id) && Number(fuente_id) > 0) {
            return Number(fuente_id);
        }

        // Si es un string (nombre del fondo), buscar su ID
        const [[fondo]] = await conexion.query(
            `SELECT id FROM fondos WHERE nombre = ?`,
            [String(fuente_id).toLowerCase()]
        );
        if (fondo) return fondo.id;

        // Fallback: crear el fondo si no existe
        const [result] = await conexion.query(
            `INSERT INTO fondos (nombre) VALUES (?)`,
            [String(fuente_id).toLowerCase()]
        );
        return result.insertId;
    }

    static async crear(datos) {
        const { responsable, fuente_id, monto_original, interes_cobrado, fecha_prestamo, fecha_vencimiento, notas } = datos;

        // Resolver fuente_id (acepta nombre string o id numérico)
        const fuenteIdFinal = await this.resolverFuenteId(fuente_id);

        // Validar si el fuente_id existe
        const fuenteValida = await this.validarFuenteId(fuenteIdFinal);
        if (!fuenteValida) {
            throw new Error(`El fuente_id ${fuenteIdFinal} no existe en la tabla fondos.`);
        }

        const [result] = await conexion.query(
            `INSERT INTO prestamos (responsable, fuente_id, monto_original, interes_cobrado, fecha_prestamo, fecha_vencimiento, notas)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [responsable, fuenteIdFinal, monto_original, interes_cobrado || 0, fecha_prestamo, fecha_vencimiento, notas || null]
        );
        return result.insertId;
    }

    static async obtenerTodos() {
        const [rows] = await conexion.query(`
            SELECT
                p.*,
                COALESCE(SUM(a.monto_abono), 0)                                      AS total_abonado,
                (p.monto_original + p.interes_cobrado)                                AS total_a_pagar,
                (p.monto_original + p.interes_cobrado - COALESCE(SUM(a.monto_abono),0)) AS saldo_pendiente,
                COALESCE(SUM(CASE WHEN a.tipo_abono = 'interes' OR a.tipo_abono = 'mixto'
                    THEN a.monto_abono ELSE 0 END), 0)                               AS intereses_abonados
            FROM prestamos p
            LEFT JOIN prestamo_abonos a ON a.prestamo_id = p.id
            GROUP BY p.id
            ORDER BY p.fecha_prestamo DESC
        `);
        return rows;
    }

    static async obtenerPorId(id) {
        const [[prestamo]] = await conexion.query(`
            SELECT
                p.*,
                COALESCE(SUM(a.monto_abono), 0)                                       AS total_abonado,
                (p.monto_original + p.interes_cobrado)                                 AS total_a_pagar,
                (p.monto_original + p.interes_cobrado - COALESCE(SUM(a.monto_abono),0)) AS saldo_pendiente
            FROM prestamos p
            LEFT JOIN prestamo_abonos a ON a.prestamo_id = p.id
            WHERE p.id = ?
            GROUP BY p.id
        `, [id]);

        if (!prestamo) return null;

        const [abonos] = await conexion.query(
            `SELECT * FROM prestamo_abonos WHERE prestamo_id = ? ORDER BY fecha_abono DESC`,
            [id]
        );

        return { ...prestamo, abonos };
    }

    static async actualizar(id, datos) {
        const { responsable, monto_original, interes_cobrado, fecha_prestamo, fecha_vencimiento, estado, notas } = datos;
        await conexion.query(
            `UPDATE prestamos SET responsable=?, monto_original=?, interes_cobrado=?, fecha_prestamo=?, fecha_vencimiento=?, estado=?, notas=? WHERE id=?`,
            [responsable, monto_original, interes_cobrado, fecha_prestamo, fecha_vencimiento, estado, notas, id]
        );
    }

    static async eliminar(id) {
        await conexion.query('DELETE FROM prestamos WHERE id = ?', [id]);
    }

    // ── ABONOS ─────────────────────────────────────────────────

    static async registrarAbono(datos) {
        let { prestamo_id, fecha_abono, monto_abono, tipo_abono, capital_pagado, interes_pagado, notas } = datos;

        // Si no vienen valores detallados, aplicar lógica de prioridades (Capital primero)
        if ((!capital_pagado || Number(capital_pagado) === 0) && (!interes_pagado || Number(interes_pagado) === 0)) {
            const [[prestamo]] = await conexion.query(`
                SELECT p.monto_original, p.interes_cobrado, 
                       COALESCE(SUM(a.capital_pagado), 0) as capital_ya_pagado,
                       COALESCE(SUM(a.interes_pagado), 0) as interes_ya_pagado
                FROM prestamos p
                LEFT JOIN prestamo_abonos a ON a.prestamo_id = p.id
                WHERE p.id = ?
                GROUP BY p.id
            `, [prestamo_id]);

            if (prestamo) {
                let montoRestante = Number(monto_abono);
                let capPendiente = Math.max(0, Number(prestamo.monto_original) - Number(prestamo.capital_ya_pagado));
                let intPendiente = Math.max(0, Number(prestamo.interes_cobrado) - Number(prestamo.interes_ya_pagado));

                capital_pagado = Math.min(montoRestante, capPendiente);
                montoRestante -= capital_pagado;
                interes_pagado = Math.min(montoRestante, intPendiente);
            }
        }

        const [result] = await conexion.query(
            `INSERT INTO prestamo_abonos (prestamo_id, fecha_abono, monto_abono, tipo_abono, capital_pagado, interes_pagado, notas)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [prestamo_id, fecha_abono, monto_abono, tipo_abono || 'mixto', capital_pagado || 0, interes_pagado || 0, notas || null]
        );

        // Verificar si el préstamo ya está pagado en su totalidad
        const [[prestamo]] = await conexion.query(`
            SELECT p.monto_original + p.interes_cobrado AS total_a_pagar,
                   COALESCE(SUM(a.monto_abono),0) AS total_abonado
            FROM prestamos p
            LEFT JOIN prestamo_abonos a ON a.prestamo_id = p.id
            WHERE p.id = ?
            GROUP BY p.id
        `, [prestamo_id]);

        if (prestamo && Number(prestamo.total_abonado) >= Number(prestamo.total_a_pagar)) {
            await conexion.query(`UPDATE prestamos SET estado='pagado' WHERE id=?`, [prestamo_id]);
        }

        return result.insertId;
    }

    static async eliminarAbono(id) {
        // Recuperar prestamo_id antes de eliminar para revertir estado si aplica
        const [[abono]] = await conexion.query('SELECT * FROM prestamo_abonos WHERE id = ?', [id]);
        await conexion.query('DELETE FROM prestamo_abonos WHERE id = ?', [id]);
        if (abono) {
            // Si el préstamo estaba marcado como pagado, revertir a activo
            await conexion.query(`
                UPDATE prestamos SET estado='activo'
                WHERE id = ? AND estado='pagado'
            `, [abono.prestamo_id]);
        }
    }

    // ── ESTADÍSTICAS ───────────────────────────────────────────

    static async obtenerEstadisticas() {
        // Capital total prestado (suma de montos originales de activos)
        const [[capsStats]] = await conexion.query(`
            SELECT
                COUNT(*) AS total_prestamos,
                COALESCE(SUM(monto_original), 0)   AS capital_total_prestado,
                COALESCE(SUM(interes_cobrado), 0)  AS intereses_esperados,
                SUM(CASE WHEN estado='activo'  THEN 1 ELSE 0 END) AS activos,
                SUM(CASE WHEN estado='pagado'  THEN 1 ELSE 0 END) AS pagados,
                SUM(CASE WHEN estado='vencido' THEN 1 ELSE 0 END) AS vencidos
            FROM prestamos
        `);

        // Intereses realmente cobrados (suma de la columna interes_pagado)
        const [[abonosStats]] = await conexion.query(`
            SELECT
                COALESCE(SUM(monto_abono), 0) AS total_abonado,
                COALESCE(SUM(interes_pagado), 0) AS intereses_cobrados
            FROM prestamo_abonos
        `);

        // Saldo pendiente total
        const [[saldoStats]] = await conexion.query(`
            SELECT COALESCE(SUM(p.monto_original + p.interes_cobrado - COALESCE(ab.total,0)), 0) AS saldo_total
            FROM prestamos p
            LEFT JOIN (
                SELECT prestamo_id, SUM(monto_abono) AS total
                FROM prestamo_abonos GROUP BY prestamo_id
            ) ab ON ab.prestamo_id = p.id
            WHERE p.estado != 'pagado'
        `);

        return {
            total_prestamos:       Number(capsStats.total_prestamos),
            capital_total_prestado: Number(capsStats.capital_total_prestado),
            intereses_esperados:   Number(capsStats.intereses_esperados) - Number(abonosStats.intereses_cobrados),
            intereses_cobrados:    Number(abonosStats.intereses_cobrados),
            total_abonado:         Number(abonosStats.total_abonado),
            saldo_pendiente:       Number(saldoStats.saldo_total),
            activos:               Number(capsStats.activos),
            pagados:               Number(capsStats.pagados),
            vencidos:              Number(capsStats.vencidos)
        };
    }

    // Intereses cobrados (para sumarse al Banco General)
    static async obtenerInteresesCobrados() {
        const [[row]] = await conexion.query(`
            SELECT COALESCE(SUM(interes_pagado), 0) AS total
            FROM prestamo_abonos
        `);
        return Number(row.total);
    }
}

module.exports = PrestamoModelo;
