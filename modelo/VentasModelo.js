const conexion = require('../database/conexion');

class VentasModelo {

    // ── DISPONIBILIDAD DE FONDOS ──────────────────────────────────
    static async obtenerDisponibilidadFondos() {
        // Calcula el saldo real disponible de cada fondo
        // Fondo 1 (Cuotas): pagos - gastos fondo1 - prestamos activos fondo1 - ventas prestadas fondo1
        // Fondo 2 (Alcantarilla): alcantarilla_ventas - premios (costo_premio) - gastos fondo2 - prestamos fondo2 - ventas fondo2
        // Fondo 3 (Ganancias/Intereses): prestamo_abonos.interes_pagado - gastos fondo3 - prestamos fondo3 - ventas fondo3
        const [rows] = await conexion.query(`
            SELECT 
                f.id,
                f.nombre,
                (
                    CASE f.id
                    WHEN 1 THEN 
                        COALESCE((SELECT SUM(monto) FROM pagos WHERE tipo_pago = 'cuota' OR tipo_pago IS NULL), 0) +
                        COALESCE((SELECT SUM(monto) FROM pagos WHERE tipo_pago = 'penalizacion'), 0) -
                        COALESCE((SELECT SUM(g.precio) FROM gastos g WHERE g.fondo_id = 1), 0) -
                        COALESCE((SELECT SUM(p2.monto_original - COALESCE((SELECT SUM(pa.capital_pagado) FROM prestamo_abonos pa WHERE pa.prestamo_id = p2.id), 0))
                            FROM prestamos p2 WHERE p2.fuente_id = 1 AND p2.estado != 'pagado'), 0) -
                        COALESCE((SELECT SUM(fp.monto_prestado) FROM ventas_fondos_prestamos fp
                            JOIN ventas_eventos ve ON fp.evento_id = ve.id
                            WHERE fp.fondo_id = 1 AND ve.estado = 'activo'), 0)
                    WHEN 2 THEN
                        COALESCE((SELECT SUM(av.monto_pagado) FROM alcantarilla_ventas av), 0) -
                        COALESCE((SELECT SUM(a2.costo_premio) FROM alcantarillas a2 WHERE a2.costo_premio IS NOT NULL), 0) -
                        COALESCE((SELECT SUM(g.precio) FROM gastos g WHERE g.fondo_id = 2), 0) -
                        COALESCE((SELECT SUM(p2.monto_original - COALESCE((SELECT SUM(pa.capital_pagado) FROM prestamo_abonos pa WHERE pa.prestamo_id = p2.id), 0))
                            FROM prestamos p2 WHERE p2.fuente_id = 2 AND p2.estado != 'pagado'), 0) -
                        COALESCE((SELECT SUM(fp.monto_prestado) FROM ventas_fondos_prestamos fp
                            JOIN ventas_eventos ve ON fp.evento_id = ve.id
                            WHERE fp.fondo_id = 2 AND ve.estado = 'activo'), 0)
                    WHEN 3 THEN
                        COALESCE((SELECT SUM(pa.interes_pagado) FROM prestamo_abonos pa), 0) -
                        COALESCE((SELECT SUM(g.precio) FROM gastos g WHERE g.fondo_id = 3), 0) -
                        COALESCE((SELECT SUM(p2.monto_original - COALESCE((SELECT SUM(pa2.capital_pagado) FROM prestamo_abonos pa2 WHERE pa2.prestamo_id = p2.id), 0))
                            FROM prestamos p2 WHERE p2.fuente_id = 3 AND p2.estado != 'pagado'), 0) -
                        COALESCE((SELECT SUM(fp.monto_prestado) FROM ventas_fondos_prestamos fp
                            JOIN ventas_eventos ve ON fp.evento_id = ve.id
                            WHERE fp.fondo_id = 3 AND ve.estado = 'activo'), 0)
                    ELSE 0
                    END
                ) AS disponible
            FROM fondos f
            WHERE f.id != 4
            ORDER BY f.id ASC
        `);
        return rows.map(r => ({ ...r, disponible: Math.max(0, Number(r.disponible)) }));
    }

    // ── EVENTOS DE VENTA ──────────────────────────────────────────
    static async crearEvento(datos) {
        const { nombre, fecha, presupuesto_total, fondos_prestamos, archivo_consolidacion, cantidad_total_productos } = datos;
        // fondos_prestamos: [{ fondo_id, monto_prestado }]

        const [result] = await conexion.query(
            `INSERT INTO ventas_eventos (nombre, fecha, presupuesto_total, archivo_consolidacion, cantidad_total_productos) VALUES (?, ?, ?, ?, ?)`,
            [nombre, fecha, presupuesto_total || 0, archivo_consolidacion || null, cantidad_total_productos || 0]
        );
        const evento_id = result.insertId;

        // Registrar los fondos de los que se toma prestado
        if (fondos_prestamos && fondos_prestamos.length > 0) {
            for (const fp of fondos_prestamos) {
                if (fp.monto_prestado > 0) {
                    await conexion.query(
                        `INSERT INTO ventas_fondos_prestamos (evento_id, fondo_id, monto_prestado) VALUES (?, ?, ?)`,
                        [evento_id, fp.fondo_id, fp.monto_prestado]
                    );
                }
            }
        }

        return evento_id;
    }

    static async obtenerEventos() {
        const [rows] = await conexion.query(`
            SELECT 
                e.*,
                (SELECT COALESCE(SUM(precio), 0) FROM ventas_gastos WHERE evento_id = e.id) AS total_invertido,
                (
                    SELECT COALESCE(SUM(a.monto_abonado), 0) 
                    FROM ventas_abonos a 
                    JOIN ventas_asignaciones asig ON a.asignacion_id = asig.id 
                    WHERE asig.evento_id = e.id
                ) AS total_recuperado,
                (
                    SELECT COUNT(*) 
                    FROM ventas_asignaciones 
                    WHERE evento_id = e.id
                ) AS total_integrantes,
                (
                    SELECT COALESCE(SUM(total_esperado), 0)
                    FROM ventas_asignaciones
                    WHERE evento_id = e.id
                ) AS total_meta,
                (
                    SELECT COALESCE(SUM(monto_prestado), 0)
                    FROM ventas_fondos_prestamos
                    WHERE evento_id = e.id
                ) AS total_prestado_fondos
            FROM ventas_eventos e
            ORDER BY e.fecha DESC
        `);

        // Para cada evento, obtener los fondos prestamistas
        for (const ev of rows) {
            const [fondos] = await conexion.query(`
                SELECT fp.*, f.nombre AS fondo_nombre
                FROM ventas_fondos_prestamos fp
                JOIN fondos f ON fp.fondo_id = f.id
                WHERE fp.evento_id = ?
                ORDER BY fp.id ASC
            `, [ev.id]);
            ev.fondos_prestamos = fondos;
            // Para compatibilidad con c??digo anterior, calculamos fondo_origen_nombre
            ev.fondo_origen_nombre = fondos.map(f => f.fondo_nombre).join(', ') || 'Sin fondo';
        }

        return rows;
    }

    static async obtenerEventoPorId(id) {
        const [rows] = await conexion.query(`SELECT * FROM ventas_eventos WHERE id = ?`, [id]);
        if (!rows[0]) return null;
        const ev = rows[0];
        const [fondos] = await conexion.query(`
            SELECT fp.*, f.nombre AS fondo_nombre
            FROM ventas_fondos_prestamos fp
            JOIN fondos f ON fp.fondo_id = f.id
            WHERE fp.evento_id = ?
        `, [id]);
        ev.fondos_prestamos = fondos;
        ev.fondo_origen_nombre = fondos.map(f => f.fondo_nombre).join(', ') || 'Sin fondo';
        return ev;
    }

    static async actualizarEstadoEvento(id, estado) {
        await conexion.query(`UPDATE ventas_eventos SET estado = ? WHERE id = ?`, [estado, id]);
    }

    static async actualizarCantidadProductos(id, cantidad) {
        await conexion.query(`UPDATE ventas_eventos SET cantidad_total_productos = ? WHERE id = ?`, [cantidad, id]);
    }

    static async actualizarPrecioUnitario(id, precio) {
        await conexion.query(`UPDATE ventas_eventos SET precio_unidad_venta = ? WHERE id = ?`, [precio, id]);
    }

    static async eliminarEvento(id) {
        await conexion.query(`DELETE FROM ventas_eventos WHERE id = ?`, [id]);
    }

    // ── GASTOS (PRESUPUESTO INICIAL) ──────────────────────────────
    static async registrarGasto(datos) {
        const { evento_id, concepto, precio, comprobante_imagen } = datos;
        const [result] = await conexion.query(
            `INSERT INTO ventas_gastos (evento_id, concepto, precio, comprobante_imagen) VALUES (?, ?, ?, ?)`,
            [evento_id, concepto, precio, comprobante_imagen || null]
        );
        return result.insertId;
    }

    static async obtenerGastosPorEvento(evento_id) {
        const [rows] = await conexion.query(`SELECT * FROM ventas_gastos WHERE evento_id = ? ORDER BY created_at ASC`, [evento_id]);
        return rows;
    }

    static async eliminarGasto(id) {
        await conexion.query(`DELETE FROM ventas_gastos WHERE id = ?`, [id]);
    }

    // ── ASIGNACIONES A INTEGRANTES ────────────────────────────────
    static async asignarIntegrantes(evento_id, asignaciones) {
        if (!asignaciones || asignaciones.length === 0) return;
        
        const values = asignaciones.map(a => [
            evento_id, 
            a.persona_id, 
            a.cantidad_productos, 
            a.precio_unidad, 
            a.total_esperado
        ]);

        await conexion.query(
            `INSERT INTO ventas_asignaciones (evento_id, persona_id, cantidad_productos, precio_unidad, total_esperado) 
             VALUES ? 
             ON DUPLICATE KEY UPDATE 
             cantidad_productos = VALUES(cantidad_productos), 
             precio_unidad = VALUES(precio_unidad), 
             total_esperado = VALUES(total_esperado)`,
            [values]
        );
    }

    static async obtenerAsignacionesPorEvento(evento_id) {
        const [rows] = await conexion.query(`
            SELECT 
                a.*, 
                p.nombre AS persona_nombre,
                COALESCE((SELECT SUM(monto_abonado) FROM ventas_abonos WHERE asignacion_id = a.id), 0) AS total_abonado,
                COALESCE((SELECT SUM(unidades_vendidas) FROM ventas_abonos WHERE asignacion_id = a.id), 0) AS total_unidades_vendidas
            FROM ventas_asignaciones a
            JOIN personas p ON a.persona_id = p.id
            WHERE a.evento_id = ?
            ORDER BY p.nombre ASC
        `, [evento_id]);
        return rows;
    }

    static async eliminarAsignacion(id) {
        await conexion.query(`DELETE FROM ventas_asignaciones WHERE id = ?`, [id]);
    }

    // ── ABONOS (RECAUDO FLEXIBLE) ─────────────────────────────────
    static async registrarAbono(datos) {
        const { asignacion_id, monto_abonado, unidades_vendidas, comprobante_transferencia } = datos;
        const [result] = await conexion.query(
            `INSERT INTO ventas_abonos (asignacion_id, monto_abonado, unidades_vendidas, comprobante_transferencia) VALUES (?, ?, ?, ?)`,
            [asignacion_id, monto_abonado, unidades_vendidas || 0, comprobante_transferencia || null]
        );
        return result.insertId;
    }

    static async obtenerAbonosPorAsignacion(asignacion_id) {
        const [rows] = await conexion.query(`SELECT * FROM ventas_abonos WHERE asignacion_id = ? ORDER BY fecha_registro ASC`, [asignacion_id]);
        return rows;
    }

    static async obtenerTodosLosAbonosPorEvento(evento_id) {
        const [rows] = await conexion.query(`
            SELECT 
                ab.*, 
                p.nombre AS persona_nombre,
                asig.precio_unidad,
                asig.cantidad_productos
            FROM ventas_abonos ab
            JOIN ventas_asignaciones asig ON ab.asignacion_id = asig.id
            JOIN personas p ON asig.persona_id = p.id
            WHERE asig.evento_id = ?
            ORDER BY ab.fecha_registro DESC
        `, [evento_id]);
        return rows;
    }

    static async eliminarAbono(id) {
        await conexion.query(`DELETE FROM ventas_abonos WHERE id = ?`, [id]);
    }
}

module.exports = VentasModelo;
