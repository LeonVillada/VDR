const conexion = require('../database/conexion');

class BancoModelo {

    /**
     * Obtiene el fondo global consolidado de TODOS los módulos.
     * 
     * FUENTES DE INGRESO:
     *  1. Cuotas quincenales (tabla pagos)
     *  2. La Alcantarilla (tabla alcantarilla_ventas)
     *  3. Intereses de préstamos cobrados (abonos tipo interes/mixto en prestamo_abonos)
     *
     * NOTA: El capital prestado NO cuenta como ingreso del banco.
     * Solo los intereses efectivamente cobrados se suman al fondo global.
     */
    static async obtenerFondoGlobal() {
        // 1. Cuotas quincenales (Recaudo total histórico)
        const [[cuotas]] = await conexion.query(`SELECT COALESCE(SUM(monto), 0) AS total FROM pagos`);

        // 2. Alcantarilla (Recaudo total - Premios repartidos)
        const [[alcantarillaRecaudo]] = await conexion.query(`SELECT COALESCE(SUM(monto_pagado), 0) AS total FROM alcantarilla_ventas`);
        const [[alcantarillaPremios]] = await conexion.query(`SELECT COALESCE(SUM(costo_premio), 0) AS total FROM alcantarillas`);
        const recaudoNetoAlcantarilla = Number(alcantarillaRecaudo.total) - Number(alcantarillaPremios.total);

        // 3. Intereses cobrados en préstamos (Ganancia real acumulada)
        const [[intereses]] = await conexion.query(`SELECT COALESCE(SUM(interes_pagado), 0) AS total FROM prestamo_abonos`);

        // 4. Gastos por fondo
        const [[gastosPorFondo]] = await conexion.query(`
            SELECT 
                fondo_id, 
                SUM(precio) AS total_gastos 
            FROM gastos 
            GROUP BY fondo_id
        `);

        const mapaGastos = {};
        if (Array.isArray(gastosPorFondo)) {
            gastosPorFondo.forEach(item => { mapaGastos[item.fondo_id] = Number(item.total_gastos); });
        } else if (gastosPorFondo) {
            mapaGastos[gastosPorFondo.fondo_id] = Number(gastosPorFondo.total_gastos);
        }

        // 5. Capital prestado actualmente en la calle (agrupado por fuente ID)
        const [prestadoPorFuente] = await conexion.query(`
            SELECT 
                p.fuente_id, 
                SUM(p.monto_original - COALESCE(ab.capital_total, 0)) AS capital_pendiente
            FROM prestamos p
            LEFT JOIN (
                SELECT prestamo_id, SUM(capital_pagado) AS capital_total
                FROM prestamo_abonos GROUP BY prestamo_id
            ) ab ON ab.prestamo_id = p.id
            WHERE p.estado != 'pagado'
            GROUP BY p.fuente_id
        `);

        // Mapa de capital prestado por fuente
        const mapaPrestado = {};
        prestadoPorFuente.forEach(item => { mapaPrestado[item.fuente_id] = Number(item.capital_pendiente); });

        // Cálculo de Saldos Líquidos (Efectivo que hay en caja)
        // 1 = Cuotas, 2 = Alcantarilla, 3 = Ganancias
        const fuenteCuotas      = Number(cuotas.total) - (mapaPrestado[1] || 0) - (mapaGastos[1] || 0);
        const fuenteAlcantarilla = recaudoNetoAlcantarilla - (mapaPrestado[2] || 0) - (mapaGastos[2] || 0);
        const fuenteIntereses    = Number(intereses.total) - (mapaPrestado[3] || 0) - (mapaGastos[3] || 0);

        const fondoTotalLíquido = fuenteCuotas + fuenteAlcantarilla + fuenteIntereses;
        const capitalEnLaCalle  = Object.values(mapaPrestado).reduce((a, b) => a + b, 0);
        const fondoPatrimonialTotal = fondoTotalLíquido + capitalEnLaCalle;

        // Obtener metas configuradas y calcular cuánto le corresponde a cada una sobre el Fondo Patrimonial Total
        const [metas] = await conexion.query('SELECT * FROM metas ORDER BY id ASC');

        const metasConMonto = metas.map(m => ({
            ...m,
            monto_disponible: (fondoPatrimonialTotal * (m.porcentaje / 100))
        }));

        // Deuda total pendiente (para info)
        const [[deuda]] = await conexion.query(`
            SELECT COALESCE(SUM(cuota * quincenas_pendientes), 0) AS total_deuda FROM personas
        `);

        // Capital total prestado (no es ingreso, solo referencia)
        const [[capitalPrestado]] = await conexion.query(`
            SELECT COALESCE(SUM(monto_original), 0) AS total FROM prestamos WHERE estado != 'pagado'
        `);

        // Resumen por mes para gráfico (cuotas)
        const [porMes] = await conexion.query(`
            SELECT DATE_FORMAT(fecha, '%Y-%m') AS mes, SUM(monto) AS cuotas
            FROM pagos GROUP BY mes ORDER BY mes ASC LIMIT 12
        `);

        // Obtener historial completo para gráficos
        const historial = await this.obtenerHistoricoFondos();

        return {
            fondo_total:           fondoTotalLíquido,
            fondo_patrimonial:     fondoPatrimonialTotal,
            fuentes: {
                cuotas:            fuenteCuotas,
                alcantarilla:      fuenteAlcantarilla,
                intereses_prestamos: fuenteIntereses
            },
            metas:                 metasConMonto,
            deuda_total_pendiente: Number(deuda.total_deuda),
            capital_prestado_activo: capitalEnLaCalle,
            historico_fondos:      historial,
            historico_por_mes:     porMes
        };
    }

    /**
     * Obtiene el historial detallado de movimientos para gráficas.
     */
    static async obtenerHistoricoFondos() {
        const query = `
            (SELECT 'ingreso_cuota' as tipo, monto as valor, fecha as fecha, 1 as fondo_id FROM pagos)
            UNION ALL
            (SELECT 'ingreso_alcantarilla', monto_pagado, DATE(fecha_registro), 2 FROM alcantarilla_ventas)
            UNION ALL
            (SELECT 'gasto', -precio, DATE(created_at), fondo_id FROM gastos)
            UNION ALL
            (SELECT 'prestamo_egreso', -monto_original, fecha_prestamo, fuente_id FROM prestamos)
            UNION ALL
            (SELECT 'abono_capital', capital_pagado, fecha_abono, p.fuente_id FROM prestamo_abonos a JOIN prestamos p ON a.prestamo_id = p.id)
            UNION ALL
            (SELECT 'abono_interes', interes_pagado, fecha_abono, 3 FROM prestamo_abonos)
            ORDER BY fecha ASC
        `;

        const [movimientos] = await conexion.query(query);

        // Agrupar por mes para gráficos limpios
        const historialPorMes = {};
        
        let balanceCuotas = 0;
        let balanceAlcantarilla = 0;
        let balanceGanancias = 0;

        movimientos.forEach(m => {
            const mes = m.fecha ? new Date(m.fecha).toISOString().substring(0, 7) : 'Sin Fecha';
            
            const v = Number(m.valor);
            if (m.fondo_id === 1) balanceCuotas += v;
            else if (m.fondo_id === 2) balanceAlcantarilla += v;
            else if (m.fondo_id === 3) balanceGanancias += v;

            historialPorMes[mes] = {
                mes,
                cuotas: balanceCuotas,
                alcantarilla: balanceAlcantarilla,
                ganancias: balanceGanancias,
                total: balanceCuotas + balanceAlcantarilla + balanceGanancias
            };
        });

        return Object.values(historialPorMes);
    }

    /**
     * Genera un resumen maestro consolidado para reportes y dashboard avanzado.
     */
    static async obtenerResumenMaestro() {
        const { calcularEstado } = require('../logic/cuotasLogic');

        // 1. Deudores de Cuotas (Personas con mora calculado dinámicamente)
        const [personasActivas] = await conexion.query('SELECT * FROM personas WHERE estado = "activo"');
        const [pagosGlobales] = await conexion.query('SELECT * FROM pagos');
        
        let deudoresCuotas = [];
        for (const p of personasActivas) {
            const pagosPersona = pagosGlobales.filter(pago => pago.persona_id === p.id);
            const estado = calcularEstado(p, pagosPersona);
            if (estado.es_moroso) {
                deudoresCuotas.push({
                    nombre: p.nombre,
                    quincenas_pendientes: estado.quincenas_en_mora.length,
                    cuota: p.cuota,
                    monto_deuda: Math.max(estado.total_deuda, 0)
                });
            }
        }
        
        // Ordenar por monto de deuda descendente
        deudoresCuotas.sort((a, b) => b.monto_deuda - a.monto_deuda);

        // 2. Préstamos Activos con deudores
        const [prestamosActivos] = await conexion.query(`
            SELECT 
                p.*,
                COALESCE(SUM(a.monto_abono), 0) AS total_abonado,
                (p.monto_original + p.interes_cobrado - COALESCE(SUM(a.monto_abono),0)) AS saldo_pendiente
            FROM prestamos p
            LEFT JOIN prestamo_abonos a ON a.prestamo_id = p.id
            WHERE p.estado != 'pagado'
            GROUP BY p.id
            ORDER BY p.fecha_prestamo DESC
        `);

        // 3. Gastos detallados con imágenes
        const [gastosDetalle] = await conexion.query(`
            SELECT g.*, GROUP_CONCAT(f.imagen) as imagenes 
            FROM gastos g
            LEFT JOIN facturas f ON f.gasto_id = g.id
            GROUP BY g.id
            ORDER BY g.created_at DESC
        `);

        // 4. Deudores de Alcantarilla (por cada alcantarilla activa)
        // Buscamos personas que NO han pagado o han pagado menos del tope en alcantarillas abiertas
        const [alcantarillasActivas] = await conexion.query('SELECT * FROM alcantarillas WHERE estado = "activa"');
        const deudoresAlcantarilla = [];
        
        for (const alc of alcantarillasActivas) {
            const [ventas] = await conexion.query(`
                SELECT p.nombre, COALESCE(v.unidades_vendidas, 0) as vendidas, ? as tope
                FROM personas p
                LEFT JOIN alcantarilla_ventas v ON v.persona_id = p.id AND v.alcantarilla_id = ?
                WHERE COALESCE(v.unidades_vendidas, 0) < ?
            `, [alc.tope_por_persona, alc.id, alc.tope_por_persona]);
            
            if (ventas.length > 0) {
                deudoresAlcantarilla.push({
                    alcantarilla: alc.nombre,
                    deudores: ventas.map(v => ({ 
                        nombre: v.nombre, 
                        faltantes: v.tope - v.vendidas,
                        deuda_pesos: (v.tope - v.vendidas) * alc.precio_boleta
                    }))
                });
            }
        }

        // 5. Consolidado por fondo (Resumen histórico)
        const [[cuotasTotal]] = await conexion.query(`SELECT COALESCE(SUM(monto), 0) AS subtotal FROM pagos`);
        const [[alcantarillaTotal]] = await conexion.query(`SELECT COALESCE(SUM(monto_pagado), 0) AS subtotal FROM alcantarilla_ventas`);
        const [[alcantarillaPremios]] = await conexion.query(`SELECT COALESCE(SUM(costo_premio), 0) AS subtotal FROM alcantarillas`);
        const [[interesTotal]] = await conexion.query(`SELECT COALESCE(SUM(interes_pagado), 0) AS subtotal FROM prestamo_abonos`);
        
        return {
            deudores_cuotas: deudoresCuotas,
            prestamos_activos: prestamosActivos,
            gastos: gastosDetalle,
            deudores_alcantarilla: deudoresAlcantarilla,
            totales_historicos: {
                cuotas: Number(cuotasTotal.subtotal),
                alcantarilla: Number(alcantarillaTotal.subtotal),
                alcantarilla_premios: Number(alcantarillaPremios.subtotal),
                ganancias: Number(interesTotal.subtotal)
            }
        };
    }
}

module.exports = BancoModelo;
