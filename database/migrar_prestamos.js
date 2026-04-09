const mysql  = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function migrar() {
    const conn = await mysql.createConnection({
        host:     process.env.DB_HOST || 'localhost',
        user:     process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'verdaderos',
        multipleStatements: true
    });

    try {
        console.log('🔄 Ejecutando migración de Préstamos...');

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS \`prestamos\` (
                \`id\`               INT(11)        NOT NULL AUTO_INCREMENT,
                \`responsable\`      VARCHAR(255)   NOT NULL,
                \`monto_original\`   DECIMAL(12,2)  NOT NULL,
                \`interes_cobrado\`  DECIMAL(12,2)  NOT NULL DEFAULT 0,
                \`fecha_prestamo\`   DATE           NOT NULL,
                \`fecha_vencimiento\` DATE          NOT NULL,
                \`estado\`           ENUM('activo','pagado','vencido') NOT NULL DEFAULT 'activo',
                \`notas\`            TEXT           DEFAULT NULL,
                \`created_at\`       DATETIME       DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
        console.log('✅ Tabla prestamos creada.');

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS \`prestamo_abonos\` (
                \`id\`           INT(11)       NOT NULL AUTO_INCREMENT,
                \`prestamo_id\`  INT(11)       NOT NULL,
                \`fecha_abono\`  DATE          NOT NULL,
                \`monto_abono\`  DECIMAL(12,2) NOT NULL,
                \`tipo_abono\`   ENUM('capital','interes','mixto') NOT NULL DEFAULT 'mixto',
                \`notas\`        TEXT          DEFAULT NULL,
                \`created_at\`   DATETIME      DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`),
                CONSTRAINT \`fk_abono_prestamo\`
                    FOREIGN KEY (\`prestamo_id\`) REFERENCES \`prestamos\` (\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
        console.log('✅ Tabla prestamo_abonos creada.');

        const [tables] = await conn.execute('SHOW TABLES');
        console.log('\n📋 Tablas en la base de datos:');
        tables.forEach(t => console.log('  -', Object.values(t)[0]));
        console.log('\n🎉 Migración completada con éxito.');
    } catch (err) {
        console.error('❌ Error durante la migración:', err.message);
        process.exit(1);
    } finally {
        await conn.end();
    }
}

migrar();
