const db = require('./conexion');

async function setup() {
    try {
        console.log('--- Iniciando configuración de tablas de fondos ---');

        // 1. Crear tabla fondos
        await db.query(`
            CREATE TABLE IF NOT EXISTS fondos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                descripcion TEXT
            )
        `);
        console.log('✅ Tabla fondos verificada.');

        // 2. Crear tabla fondos_especificos
        await db.query(`
            CREATE TABLE IF NOT EXISTS fondos_especificos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                descripcion TEXT,
                fondo_id INT NOT NULL,
                FOREIGN KEY (fondo_id) REFERENCES fondos(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Tabla fondos_especificos verificada.');

        // 3. Seed fondos base
        const [existing] = await db.query('SELECT * FROM fondos');
        if (existing.length === 0) {
            await db.query(`
                INSERT INTO fondos (nombre, descripcion) VALUES 
                ('Cuotas', 'Fondo proveniente de las cuotas quincenales de los socios'),
                ('Alcantarilla', 'Fondo proveniente de las ventas de la alcantarilla'),
                ('Ganancias', 'Fondo donde se acumulan los intereses y rendimientos de préstamos e inversiones')
            `);
            console.log('✅ Fondos base creados (Cuotas, Alcantarilla, Ganancias).');
        }

        // 4. Asegurar tabla facturas (para múltiples imágenes)
        await db.query(`
            CREATE TABLE IF NOT EXISTS facturas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                gasto_id INT NOT NULL,
                imagen VARCHAR(255) NOT NULL,
                FOREIGN KEY (gasto_id) REFERENCES gastos(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Tabla facturas verificada.');

        // 5. Ajustar tabla gastos (fondo string -> fondo_id int)
        // Primero verificamos si ya existe fondo_id
        const [cols] = await db.query('DESCRIBE gastos');
        const hasFondoId = cols.some(c => c.Field === 'fondo_id');
        
        if (!hasFondoId) {
            console.log('⚠️ Ajustando tabla gastos...');
            await db.query('ALTER TABLE gastos ADD COLUMN fondo_id INT AFTER fondo');
            
            // Mapeo inicial (opcional si no hay datos, pero por si acaso)
            await db.query("UPDATE gastos SET fondo_id = 1 WHERE fondo = 'cuotas'");
            await db.query("UPDATE gastos SET fondo_id = 2 WHERE fondo = 'alcantarilla'");
            
            // Poner fondo_id = 1 (Cuotas) por defecto a los que no tengan match
            await db.query("UPDATE gastos SET fondo_id = 1 WHERE fondo_id IS NULL");
            
            // Eliminar columna vieja y añadir FK
            await db.query('ALTER TABLE gastos DROP COLUMN fondo');
            await db.query('ALTER TABLE gastos ADD CONSTRAINT fk_gastos_fondo FOREIGN KEY (fondo_id) REFERENCES fondos(id)');
            console.log('✅ Tabla gastos actualizada a fondo_id.');
        }

        // 6. Ajustar tabla prestamos (fuente_id string -> fuente_id int)
        const [pCols] = await db.query('DESCRIBE prestamos');
        const fuenteType = pCols.find(c => c.Field === 'fuente_id')?.Type;
        
        if (fuenteType && fuenteType.includes('varchar')) {
            console.log('⚠️ Ajustando tabla prestamos...');
            // Crear columna temporal
            await db.query('ALTER TABLE prestamos ADD COLUMN fuente_id_new INT AFTER fuente_id');
            
            // Mapear valores
            await db.query("UPDATE prestamos SET fuente_id_new = 1 WHERE fuente_id = 'cuotas'");
            await db.query("UPDATE prestamos SET fuente_id_new = 2 WHERE fuente_id = 'alcantarilla'");
            await db.query("UPDATE prestamos SET fuente_id_new = 3 WHERE fuente_id = 'ganancias'");
            await db.query("UPDATE prestamos SET fuente_id_new = 1 WHERE fuente_id_new IS NULL");

            // Eliminar vieja y renombrar nueva
            await db.query('ALTER TABLE prestamos DROP COLUMN fuente_id');
            await db.query('ALTER TABLE prestamos CHANGE fuente_id_new fuente_id INT');
            await db.query('ALTER TABLE prestamos ADD CONSTRAINT fk_prestamos_fuente FOREIGN KEY (fuente_id) REFERENCES fondos(id)');
            console.log('✅ Tabla prestamos actualizada a fuente_id INT.');
        }

        console.log('--- Configuración finalizada con éxito ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en el setup:', error);
        process.exit(1);
    }
}

setup();
