const mysql  = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function alterarTabla() {
    const conn = await mysql.createConnection({
        host:     process.env.DB_HOST || 'localhost',
        user:     process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'verdaderos'
    });

    try {
        console.log('🔄 Actualizando tabla prestamo_abonos...');
        
        // Agregar columnas para desglose
        await conn.execute(`
            ALTER TABLE prestamo_abonos 
            ADD COLUMN capital_pagado DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER monto_abono,
            ADD COLUMN interes_pagado DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER capital_pagado
        `);
        
        // Migrar datos existentes: 
        // Si el tipo era 'interes', todo va a interes_pagado
        // Si el tipo era 'capital', todo va a capital_pagado
        // Si el tipo era 'mixto', no podemos saber el desglose retroactivo, 
        // pero para evitar el error visual actual del usuario ($80.000), 
        // vamos a intentar algo inteligente o dejarlo en 0 para que no distorsione.
        
        await conn.execute(`
            UPDATE prestamo_abonos SET interes_pagado = monto_abono WHERE tipo_abono = 'interes'
        `);
        await conn.execute(`
            UPDATE prestamo_abonos SET capital_pagado = monto_abono WHERE tipo_abono = 'capital'
        `);
        
        console.log('✅ Columnas añadidas y datos migrados (interes/capital).');
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAMES') {
            console.log('ℹ️ Las columnas ya existen.');
        } else {
            console.error('❌ Error:', err.message);
        }
    } finally {
        await conn.end();
    }
}

alterarTabla();
