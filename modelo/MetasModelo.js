const conexionPromise = require('../database/conexion');

class MetasModelo {
    static async crear(datos) {
        const { nombre, porcentaje, descripcion } = datos;
        const [result] = await conexionPromise.query(
            'INSERT INTO metas (nombre, porcentaje, descripcion) VALUES (?, ?, ?)',
            [nombre, porcentaje, descripcion]
        );
        return result.insertId;
    }

    static async obtenerTodas() {
        const [rows] = await conexionPromise.query('SELECT * FROM metas');
        return rows;
    }

    static async actualizar(id, datos) {
        const { id: _, ...rest } = datos;
        await conexionPromise.query('UPDATE metas SET ? WHERE id = ?', [rest, id]);
    }

    static async eliminar(id) {
        await conexionPromise.query('DELETE FROM metas WHERE id = ?', [id]);
    }

    static async obtenerEstadisticasMetas() {
        const [metas] = await conexionPromise.query('SELECT * FROM metas');
        // Usar la estadística de ingresos para calcular montos
        const PagoModelo = require('../modelo/PagoModelo');
        const statsPagos = await PagoModelo.obtenerEstadisticas();

        // Asignar monto basado en porcentaje vs total recaudado
        const totalRecaudado = statsPagos.total || 0;

        return metas.map(meta => ({
            ...meta,
            monto_disponible: (totalRecaudado * (meta.porcentaje / 100))
        }));
    }
}

module.exports = MetasModelo;
