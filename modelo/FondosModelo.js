const db = require('../database/conexion');

const FondosModelo = {
    obtenerTodos: async () => {
        const [rows] = await db.query('SELECT * FROM fondos');
        return rows;
    },

    crear: async (fondo) => {
        const { nombre, descripcion } = fondo;
        const [result] = await db.query(
            'INSERT INTO fondos (nombre, descripcion) VALUES (?, ?)',
            [nombre, descripcion]
        );
        return { id: result.insertId, ...fondo };
    },

    actualizar: async (id, datosActualizados) => {
        const { nombre, descripcion } = datosActualizados;
        await db.query(
            'UPDATE fondos SET nombre = ?, descripcion = ? WHERE id = ?',
            [nombre, descripcion, id]
        );
        return { id, ...datosActualizados };
    },

    eliminar: async (id) => {
        await db.query('DELETE FROM fondos WHERE id = ?', [id]);
    }
};

module.exports = FondosModelo;