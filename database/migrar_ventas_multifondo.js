const conexion = require('../database/conexion');

async function run() {
    try {
        await conexion.query(`
            CREATE TABLE IF NOT EXISTS ventas_fondos_prestamos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                evento_id INT NOT NULL,
                fondo_id INT NOT NULL,
                monto_prestado DECIMAL(15,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (evento_id) REFERENCES ventas_eventos(id) ON DELETE CASCADE,
                FOREIGN KEY (fondo_id) REFERENCES fondos(id)
            )
        `);
        console.log('Tabla ventas_fondos_prestamos OK');
    } catch (e) {
        console.log('ventas_fondos_prestamos error:', e.message);
    }

    try {
        await conexion.query(`ALTER TABLE ventas_eventos ADD COLUMN presupuesto_total DECIMAL(15,2) DEFAULT 0`);
        console.log('Columna presupuesto_total agregada');
    } catch (e) {
        console.log('presupuesto_total ya existe o error:', e.message);
    }

    console.log('Migracion completa');
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
