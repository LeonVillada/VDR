const conexionPromise = require('../database/conexion');

class PagoModelo {
    static async crear(datos) {
        const { persona_id, fecha, monto, quincena } = datos;
        const [result] = await conexionPromise.query(
            'INSERT INTO pagos (persona_id, fecha, monto, quincena) VALUES (?, ?, ?, ?)',
            [persona_id, fecha, monto, quincena]
        );
        return result.insertId;
    }

    static async obtenerTodos() {
        const [rows] = await conexionPromise.query(`
            SELECT p.*, per.nombre as persona_nombre 
            FROM pagos p 
            JOIN personas per ON p.persona_id = per.id
            ORDER BY p.fecha DESC
        `);
        return rows;
    }

    static async obtenerPorPersona(persona_id) {
        const [rows] = await conexionPromise.query('SELECT * FROM pagos WHERE persona_id = ? ORDER BY fecha DESC', [persona_id]);
        return rows;
    }

    static async eliminar(id) {
        await conexionPromise.query('DELETE FROM pagos WHERE id = ?', [id]);
    }

    static async obtenerEstadisticas() {
        // Total recaudado
        const [totalIngresos] = await conexionPromise.query('SELECT SUM(monto) as total FROM pagos');

        // Ingresos por mes para el gráfico
        const [ingresosPorMes] = await conexionPromise.query(`
            SELECT DATE_FORMAT(fecha, '%Y-%m') as mes, SUM(monto) as total 
            FROM pagos 
            GROUP BY mes 
            ORDER BY mes ASC
            LIMIT 12
        `);

        // Deuda total (Suma de cuota * quincenas_pendientes de todos)
        const [deudaTotal] = await conexionPromise.query('SELECT SUM(cuota * quincenas_pendientes) as total_deuda FROM personas');

        return {
            total: totalIngresos[0].total || 0,
            porMes: ingresosPorMes,
            deudaTotal: deudaTotal[0].total_deuda || 0
        };
    }
}

module.exports = PagoModelo;