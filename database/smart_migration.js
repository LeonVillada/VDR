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
