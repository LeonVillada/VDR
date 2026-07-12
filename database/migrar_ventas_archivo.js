const conexion = require('./conexion');

async function run() {
  try {
    await conexion.query("ALTER TABLE ventas_eventos ADD COLUMN archivo_consolidacion VARCHAR(255) NULL");
    console.log('✅ Columna archivo_consolidacion agregada a ventas_eventos');
  } catch(e) {
    console.log('Columna archivo_consolidacion ya existe o error:', e.message);
  }
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
