const db = require('../database/conexion');

const FondosEspecificosModelo = {
    obtenerTodos: async () => {
        const [rows] = await db.query('SELECT * FROM fondos_especificos');
        return rows;
    },

    crear: async (fondoEspecifico) => {
        const { nombre, descripcion, fondo_id } = fondoEspecifico;
        const [result] = await db.query(
            'INSERT INTO fondos_especificos (nombre, descripcion, fondo_id) VALUES (?, ?, ?)',
            [nombre, descripcion, fondo_id]
        );
        return { id: result.insertId, ...fondoEspecifico };
    },

    actualizar: async (id, datosActualizados) => {
        const { nombre, descripcion, fondo_id } = datosActualizados;
        await db.query(
            'UPDATE fondos_especificos SET nombre = ?, descripcion = ?, fondo_id = ? WHERE id = ?',
            [nombre, descripcion, fondo_id, id]
        );
        return { id, ...datosActualizados };
    },

    eliminar: async (id) => {
        await db.query('DELETE FROM fondos_especificos WHERE id = ?', [id]);
    }
};

module.exports = FondosEspecificosModelo;