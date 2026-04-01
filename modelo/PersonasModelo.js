const conexionPromise = require('../database/conexion');

class PersonaModelo {
    static async crear(datos) {
        const { nombre, cuota, quincenas_pendientes, penalizacion, fecha_ingreso, estado } = datos;
        const [result] = await conexionPromise.query(
            'INSERT INTO personas (nombre, cuota, quincenas_pendientes, penalizacion, fecha_ingreso, estado) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, cuota, quincenas_pendientes || 0, penalizacion || 0, fecha_ingreso || new Date().toISOString().split('T')[0], estado || 'activo']
        );
        return result.insertId;
    }

    static async obtenerTodos() {
        const [rows] = await conexionPromise.query('SELECT * FROM personas');
        return rows;
    }

    static async obtenerPorId(id) {
        const [rows] = await conexionPromise.query('SELECT * FROM personas WHERE id = ?', [id]);
        return rows[0];
    }

    static async actualizar(id, datos) {
        // Remove id from datos to avoid error in update
        const { id: _, ...rest } = datos;
        await conexionPromise.query('UPDATE personas SET ? WHERE id = ?', [rest, id]);
    }

    static async eliminar(id) {
        await conexionPromise.query('DELETE FROM personas WHERE id = ?', [id]);
    }
}

module.exports = PersonaModelo;