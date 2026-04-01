const conexionPromise = require('./database/conexion');

async function migrate() {
    try {
        console.log('Iniciando migración...');

        // Agregar fecha_ingreso si no existe
        try {
            await conexionPromise.query('ALTER TABLE personas ADD COLUMN fecha_ingreso DATE DEFAULT (CURRENT_DATE)');
            console.log('✅ Columna fecha_ingreso añadida');
        } catch (e) {
            console.log('ℹ️ La columna fecha_ingreso ya podría existir o hubo un error manejado.');
        }

        // Agregar estado si no existe
        try {
            await conexionPromise.query("ALTER TABLE personas ADD COLUMN estado VARCHAR(20) DEFAULT 'activo'");
            console.log('✅ Columna estado añadida');
        } catch (e) {
            console.log('ℹ️ La columna estado ya podría existir.');
        }

        console.log('Migración completada.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en la migración:', error);
        process.exit(1);
    }
}

migrate();
