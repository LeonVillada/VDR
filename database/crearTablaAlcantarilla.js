const db = require('./conexion');

async function crearTablas() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS alcantarillas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                fecha DATE NOT NULL,
                precio_boleta DECIMAL(10,2) NOT NULL DEFAULT 1000,
                costo_premio DECIMAL(10,2) NOT NULL DEFAULT 0,
                tope_por_persona INT NOT NULL DEFAULT 30,
                estado ENUM('activa','cerrada') DEFAULT 'activa',
                creado_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabla alcantarillas creada/verificada.');

        await db.query(`
            CREATE TABLE IF NOT EXISTS alcantarilla_ventas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                alcantarilla_id INT NOT NULL,
                persona_id INT NOT NULL,
                unidades_vendidas INT NOT NULL DEFAULT 0,
                monto_pagado DECIMAL(10,2) NOT NULL DEFAULT 0,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (alcantarilla_id) REFERENCES alcantarillas(id) ON DELETE CASCADE,
                FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
                UNIQUE KEY unique_venta (alcantarilla_id, persona_id)
            )
        `);
        console.log('✅ Tabla alcantarilla_ventas creada/verificada.');

        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
}

crearTablas();
