const db = require('./conexion');

async function crearTablaEventos() {
    try {
        // Tabla principal de eventos
        await db.query(`
            CREATE TABLE IF NOT EXISTS eventos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(200) NOT NULL,
                descripcion TEXT,
                fecha_evento DATE NOT NULL,
                estado ENUM('planificado', 'en_curso', 'finalizado', 'cancelado') DEFAULT 'planificado',
                cuota_persona DECIMAL(12,2) DEFAULT 0 COMMENT 'Cuota individual por persona para el evento',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('✅ Tabla "eventos" creada/verificada.');

        // Tabla de recaudos (quién pagó la cuota del evento)
        await db.query(`
            CREATE TABLE IF NOT EXISTS evento_recaudos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                evento_id INT NOT NULL,
                persona VARCHAR(100) NOT NULL,
                monto DECIMAL(12,2) NOT NULL,
                fecha_pago DATE NOT NULL,
                notas TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('✅ Tabla "evento_recaudos" creada/verificada.');

        // Tabla de gastos del evento
        await db.query(`
            CREATE TABLE IF NOT EXISTS evento_gastos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                evento_id INT NOT NULL,
                concepto VARCHAR(200) NOT NULL,
                monto DECIMAL(12,2) NOT NULL,
                fecha_gasto DATE NOT NULL,
                notas TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('✅ Tabla "evento_gastos" creada/verificada.');

        console.log('🎉 Todas las tablas de eventos creadas exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al crear tablas de eventos:', error);
        process.exit(1);
    }
}

crearTablaEventos();
