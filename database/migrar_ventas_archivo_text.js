const conexion = require('./conexion');

async function run() {
  try {
    await conexion.query("ALTER TABLE ventas_eventos MODIFY COLUMN archivo_consolidacion TEXT NULL");
    console.log('✅ Columna archivo_consolidacion modificada a TEXT');
  } catch(e) {
    console.log('Error modificando columna:', e.message);
  }
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
