const db = require('../database/conexion');

const GastosModelo = {
    obtenerTodos: async () => {
        const [rows] = await db.query(`
            SELECT g.*, f.nombre as fondo_nombre 
            FROM gastos g
            LEFT JOIN fondos f ON g.fondo_id = f.id
            ORDER BY g.created_at DESC
        `);
        
        // Obtener imágenes para cada gasto
        const [imagenes] = await db.query('SELECT * FROM facturas');
        
        return rows.map(gasto => ({
            ...gasto,
            imagenes: imagenes.filter(img => img.gasto_id === gasto.id).map(img => img.imagen)
        }));
    },

    crear: async (gasto) => {
        const { evento, precio, fondo_id, observaciones, imagenes = [] } = gasto;
        const [result] = await db.query(
            'INSERT INTO gastos (evento, precio, fondo_id, observaciones) VALUES (?, ?, ?, ?)',
            [evento, precio, fondo_id, observaciones]
        );
        const gastoId = result.insertId;

        // Insertar imágenes si existen
        if (imagenes.length > 0) {
            const values = imagenes.map(img => [gastoId, img]);
            await db.query('INSERT INTO facturas (gasto_id, imagen) VALUES ?', [values]);
        }

        return { id: gastoId, ...gasto };
    },

    actualizar: async (id, datosActualizados) => {
        const { evento, precio, fondo_id, observaciones } = datosActualizados;
        await db.query(
            'UPDATE gastos SET evento = ?, precio = ?, fondo_id = ?, observaciones = ? WHERE id = ?',
            [evento, precio, fondo_id, observaciones, id]
        );
        return { id, ...datosActualizados };
    },

    eliminar: async (id) => {
        await db.query('DELETE FROM gastos WHERE id = ?', [id]);
    },

    agregarImagenes: async (gastoId, imagenes) => {
        if (!imagenes || imagenes.length === 0) return;
        const values = imagenes.map(img => [gastoId, img]);
        await db.query('INSERT INTO facturas (gasto_id, imagen) VALUES ?', [values]);
    }
};

module.exports = GastosModelo;