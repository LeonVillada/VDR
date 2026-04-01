const conexionPromise = require('../database/conexion');

async function crearTablaMetas() {
    try {
        const connection = await conexionPromise.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS metas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                porcentaje DECIMAL(5,2) DEFAULT 0,
                descripcion TEXT
            )
        `);

        // Insertar metas por defecto si está vacía
        const [rows] = await connection.query('SELECT count(*) as count FROM metas');
        if (rows[0].count === 0) {
            await connection.query(`
                INSERT INTO metas (nombre, porcentaje, descripcion) VALUES 
                ('Fondo de Emergencia', 10, 'Reserva para imprevistos'),
                ('Actividad Fin de Año', 40, 'Fiesta y despedida 2026'),
                ('Inversiones', 50, 'Fondo para generar rendimientos')
            `);
            console.log('✅ Metas por defecto insertadas');
        }

        console.log('✅ Tabla metas verificada/creada');
        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creando tabla metas:', error);
        process.exit(1);
    }
}

crearTablaMetas();
