const conexion = require('./conexion');

async function run() {
  try {
    await conexion.query("ALTER TABLE ventas_eventos ADD COLUMN cantidad_total_productos INT NOT NULL DEFAULT 0");
    console.log('✅ Columna cantidad_total_productos agregada a ventas_eventos');
  } catch(e) {
    console.log('Error o ya existe cantidad_total_productos:', e.message);
  }

  try {
    await conexion.query("ALTER TABLE ventas_abonos ADD COLUMN comprobante_transferencia VARCHAR(255) NULL");
    console.log('✅ Columna comprobante_transferencia agregada a ventas_abonos');
  } catch(e) {
    console.log('Error o ya existe comprobante_transferencia:', e.message);
  }
  
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
