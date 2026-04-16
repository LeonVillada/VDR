const mysql  = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function migrarDatosInteligente() {
    const conn = await mysql.createConnection({
        host:     process.env.DB_HOST || 'localhost',
        user:     process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'verdaderos'
    });

    try {
        console.log('🔄 Iniciando migración inteligente de abonos mixtos...');

        // Crear tabla de gastos
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS gastos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                evento VARCHAR(255) NOT NULL,
                precio DECIMAL(10, 2) NOT NULL,
                fondo VARCHAR(255) NOT NULL,
                observaciones TEXT,
                sin_factura BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);

        // Crear tabla de facturas
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS facturas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                gasto_id INT NOT NULL,
                imagen VARCHAR(255) NOT NULL,
                FOREIGN KEY (gasto_id) REFERENCES gastos(id)
            ) ENGINE=InnoDB;
        `);

        console.log('✅ Tablas de gastos y facturas creadas o ya existentes.');

        // 1. Obtener todos los abonos mixtos que tengan 0 en ambos desgloses
        const [abonos] = await conn.execute(`
            SELECT a.*, p.interes_cobrado, p.monto_original 
            FROM prestamo_abonos a
            JOIN prestamos p ON a.prestamo_id = p.id
            WHERE a.tipo_abono = 'mixto' AND a.interes_pagado = 0 AND a.capital_pagado = 0
        `);

        console.log(`🔎 Encontrados ${abonos.length} abonos por procesar.`);

        for (const abono of abonos) {
            // Obtener cuánto se ha pagado de interés previamente para este préstamo
            const [[alreadyPaid]] = await conn.execute(`
                SELECT COALESCE(SUM(interes_pagado), 0) AS total
                FROM prestamo_abonos
                WHERE prestamo_id = ? AND id < ?
            `, [abono.prestamo_id, abono.id]);

            const intPendiente = abono.interes_cobrado - alreadyPaid.total;
            const intParaEsteAbono = Math.min(abono.monto_abono, Math.max(0, intPendiente));
            const capParaEsteAbono = abono.monto_abono - intParaEsteAbono;

            await conn.execute(`
                UPDATE prestamo_abonos 
                SET interes_pagado = ?, capital_pagado = ?
                WHERE id = ?
            `, [intParaEsteAbono, capParaEsteAbono, abono.id]);

            console.log(`✅ Abono ID ${abono.id}: Interés=$${intParaEsteAbono}, Capital=$${capParaEsteAbono}`);
        }

        console.log('\n🎉 Migración inteligente finalizada.');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await conn.end();
    }
}

migrarDatosInteligente();
