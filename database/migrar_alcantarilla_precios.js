/**
 * Migración: Precios flexibles en Alcantarillas
 * ──────────────────────────────────────────────
 * Asegura que la tabla `alcantarillas` tenga:
 *   - precio_boleta    DECIMAL(10,2)  → precio variable por evento
 *   - tope_por_persona INT            → boletas asignadas por integrante
 *   - comprobante_premio VARCHAR      → foto de la factura del premio
 *
 * También actualiza los defaults para que los nuevos
 * registros puedan tener valores distintos entre sí.
 */

const db = require('./conexion');

async function migrar() {
    try {
        console.log('🔄 Iniciando migración de precios flexibles en alcantarillas...\n');

        // 1. Verificar columnas existentes
        const [cols] = await db.query(`
            SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME   = 'alcantarillas'
        `);
        const colNames = cols.map(c => c.COLUMN_NAME);
        console.log('📋 Columnas actuales:', colNames.join(', '));

        // 2. Agregar comprobante_premio si no existe
        if (!colNames.includes('comprobante_premio')) {
            await db.query(`
                ALTER TABLE alcantarillas
                ADD COLUMN comprobante_premio VARCHAR(255) DEFAULT NULL
                AFTER estado
            `);
            console.log('✅ Columna comprobante_premio agregada.');
        } else {
            console.log('⏭  comprobante_premio ya existe.');
        }

        // 3. Ajustar defaults de precio_boleta y tope_por_persona
        //    (no se cambia el tipo, solo el default para reflejar flexibilidad)
        await db.query(`
            ALTER TABLE alcantarillas
            MODIFY COLUMN precio_boleta   DECIMAL(10,2) NOT NULL DEFAULT 3000 COMMENT 'Precio por boleta — varía por evento',
            MODIFY COLUMN tope_por_persona INT           NOT NULL DEFAULT 15   COMMENT 'Boletas asignadas por integrante'
        `);
        console.log('✅ Defaults actualizados: precio_boleta=3000, tope_por_persona=15');

        // 4. Resumen de la tabla final
        const [finalCols] = await db.query(`
            SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, EXTRA
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME   = 'alcantarillas'
            ORDER BY ORDINAL_POSITION
        `);
        console.log('\n📊 Estructura final de la tabla alcantarillas:');
        console.table(finalCols.map(c => ({
            Columna:  c.COLUMN_NAME,
            Tipo:     c.COLUMN_TYPE,
            Default:  c.COLUMN_DEFAULT,
            Extra:    c.EXTRA
        })));

        console.log('\n✅ Migración completada exitosamente.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error durante la migración:', e.message);
        process.exit(1);
    }
}

migrar();
