const mysql  = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function integrarFuentes() {
    const conn = await mysql.createConnection({
        host:     process.env.DB_HOST || 'localhost',
        user:     process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'verdaderos'
    });

    try {
        console.log('🔄 Añadiendo columna fuente_id a la tabla prestamos...');
        
        await conn.execute(`
            ALTER TABLE prestamos 
            ADD COLUMN fuente_id VARCHAR(50) NOT NULL DEFAULT 'cuotas' AFTER responsable
        `);

        // Migrar existentes a 'cuotas' (ya es el default, pero aseguramos)
        await conn.execute("UPDATE prestamos SET fuente_id = 'cuotas'");

        console.log('✅ Base de datos actualizada y préstamos asignados a "cuotas".');
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAMES') {
            console.log('ℹ️ La columna fuente_id ya existe.');
        } else {
            console.error('❌ Error:', err.message);
        }
    } finally {
        await conn.end();
    }
}

integrarFuentes();
