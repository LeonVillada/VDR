const db = require('./conexion');

async function migrarVentas() {
    try {
        console.log('--- Iniciando migración de la base de datos para el módulo de Ventas ---');

        // 1. Agregar el fondo 'Ventas' si no existe
        const [fondos] = await db.query('SELECT * FROM fondos WHERE id = 4');
        if (fondos.length === 0) {
            await db.query(`
                INSERT INTO fondos (id, nombre, descripcion) 
                VALUES (4, 'Ventas', 'Fondo proveniente de las utilidades de eventos de ventas')
            `);
            console.log('✅ Fondo "Ventas" (id=4) creado.');
        } else {
            console.log('✅ Fondo "Ventas" ya existe.');
        }

        // 2. Tabla ventas_eventos
        await db.query(`
            CREATE TABLE IF NOT EXISTS ventas_eventos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                fecha DATE NOT NULL,
                fondo_origen_id INT NOT NULL,
                estado ENUM('activo', 'cerrado') DEFAULT 'activo',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (fondo_origen_id) REFERENCES fondos(id)
            )
        `);
        console.log('✅ Tabla ventas_eventos verificada.');

        // 3. Tabla ventas_gastos (Ingredientes / Compras)
        await db.query(`
            CREATE TABLE IF NOT EXISTS ventas_gastos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                evento_id INT NOT NULL,
                concepto VARCHAR(255) NOT NULL,
                precio DECIMAL(12,2) NOT NULL DEFAULT 0,
                comprobante_imagen VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (evento_id) REFERENCES ventas_eventos(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Tabla ventas_gastos verificada.');

        // 4. Tabla ventas_asignaciones (Integrantes y Productos asignados)
        await db.query(`
            CREATE TABLE IF NOT EXISTS ventas_asignaciones (
                id INT AUTO_INCREMENT PRIMARY KEY,
                evento_id INT NOT NULL,
                persona_id INT NOT NULL,
                cantidad_productos INT NOT NULL DEFAULT 0,
                precio_unidad DECIMAL(12,2) NOT NULL DEFAULT 0,
                total_esperado DECIMAL(12,2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (evento_id) REFERENCES ventas_eventos(id) ON DELETE CASCADE,
                FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE,
                UNIQUE KEY unique_asignacion (evento_id, persona_id)
            )
        `);
        console.log('✅ Tabla ventas_asignaciones verificada.');

        // 5. Tabla ventas_abonos (Abonos parciales o totales que hace cada integrante)
        await db.query(`
            CREATE TABLE IF NOT EXISTS ventas_abonos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                asignacion_id INT NOT NULL,
                monto_abonado DECIMAL(12,2) NOT NULL DEFAULT 0,
                unidades_vendidas INT NOT NULL DEFAULT 0,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (asignacion_id) REFERENCES ventas_asignaciones(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Tabla ventas_abonos verificada.');

        console.log('--- Migración finalizada con éxito ---');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error en la migración de Ventas:', e);
        process.exit(1);
    }
}

migrarVentas();
