const db = require('./conexion');

async function migrar() {
    try {
        console.log('🔄 Iniciando migración para tabla alcantarilla_participantes...');

        // 1. Crear la tabla de participantes
        await db.query(`
            CREATE TABLE IF NOT EXISTS alcantarilla_participantes (
                alcantarilla_id INT NOT NULL,
                persona_id INT NOT NULL,
                PRIMARY KEY (alcantarilla_id, persona_id),
                FOREIGN KEY (alcantarilla_id) REFERENCES alcantarillas(id) ON DELETE CASCADE,
                FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Tabla alcantarilla_participantes creada/verificada.');

        // 2. Obtener todas las alcantarillas existentes
        const [alcantarillas] = await db.query('SELECT * FROM alcantarillas');
        
        // 3. Obtener todas las personas
        const [personas] = await db.query('SELECT id, nombre, fecha_ingreso FROM personas');

        // 4. Poblar participantes por defecto para alcantarillas existentes
        //    (personas con fecha_ingreso <= fecha_alcantarilla)
        let totalInsertados = 0;
        for (const alc of alcantarillas) {
            const alcFecha = new Date(alc.fecha);
            
            // Filtrar personas vigentes a esa fecha
            const elegibles = personas.filter(p => {
                const ingreso = new Date(p.fecha_ingreso);
                return ingreso <= alcFecha;
            });

            if (elegibles.length > 0) {
                for (const persona of elegibles) {
                    try {
                        await db.query(
                            'INSERT IGNORE INTO alcantarilla_participantes (alcantarilla_id, persona_id) VALUES (?, ?)',
                            [alc.id, persona.id]
                        );
                        totalInsertados++;
                    } catch (err) {
                        // Ignorar errores de duplicados u otros
                    }
                }
            }
        }
        console.log(`✅ ${totalInsertados} registros de participación iniciales insertados.`);

        // 5. Excluir específicamente a Arlinson (id=16, o buscar por nombre si el ID varía)
        //    del evento Alcantarilla #2
        //    Buscamos la persona Arlinson
        const [[arlinson]] = await db.query('SELECT id FROM personas WHERE nombre LIKE "%arlinson%"');
        const [[alcantarilla2]] = await db.query('SELECT id FROM alcantarillas WHERE nombre LIKE "%# 2%" OR nombre LIKE "%#2%"');

        if (arlinson && alcantarilla2) {
            await db.query(
                'DELETE FROM alcantarilla_participantes WHERE alcantarilla_id = ? AND persona_id = ?',
                [alcantarilla2.id, arlinson.id]
            );
            console.log(`✅ Excluido Arlinson (ID: ${arlinson.id}) del evento Alcantarilla #2 (ID: ${alcantarilla2.id}).`);
        } else {
            console.log('ℹ️ No se encontró a Arlinson o la Alcantarilla #2 para la exclusión manual.');
        }

        console.log('✅ Migración finalizada.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error durante la migración:', e.message);
        process.exit(1);
    }
}

migrar();
