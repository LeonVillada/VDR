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
        const [[cuotas]] = await conexion.query(`SELECT COALESCE(SUM(monto), 0) AS total FROM pagos WHERE tipo_pago = 'cuota' OR tipo_pago IS NULL`);
        
        // 1.5 Penalizaciones (Recaudo de multas)
        const [[penalizaciones]] = await conexion.query(`SELECT COALESCE(SUM(monto), 0) AS total FROM pagos WHERE tipo_pago = 'penalizacion'`);

        // 1.7 Penalizaciones Pendientes (calculadas dinámicamente)
        const [personasActivas] = await conexion.query('SELECT * FROM personas WHERE estado = "activo"');
        const [pagosGlobales] = await conexion.query('SELECT * FROM pagos');
        const { calcularEstado } = require('../logic/cuotasLogic');
        
        let penalizacionesPendientesMonto = 0;
        let penalizacionesPendientesCount = 0;
        
        for (const p of personasActivas) {
            const pagosPersona = pagosGlobales.filter(pago => pago.persona_id === p.id);
            const estado = calcularEstado(p, pagosPersona);
            if (estado.penalizacion_sugerida > 0) {
                penalizacionesPendientesMonto += estado.penalizacion_sugerida;
                penalizacionesPendientesCount += 1;
            }
        }

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

        // 4.5 Módulo de Ventas: Préstamos internos y ganancias (multi-fondo)
        const [ventasEventos] = await conexion.query(`
            SELECT 
                e.id,
                COALESCE((SELECT SUM(precio) FROM ventas_gastos WHERE evento_id = e.id), 0) AS capital_invertido,
                COALESCE((
                    SELECT SUM(a.monto_abonado) 
                    FROM ventas_abonos a 
                    JOIN ventas_asignaciones asig ON a.asignacion_id = asig.id 
                    WHERE asig.evento_id = e.id
                ), 0) AS capital_recuperado
            FROM ventas_eventos e
        `);

        // Para cada evento buscar los fondos prestamistas reales
        const [ventasFondosPrestamos] = await conexion.query(`
            SELECT fp.evento_id, fp.fondo_id, fp.monto_prestado
            FROM ventas_fondos_prestamos fp
        `);

        let ventasPrestadoPorFondo = {}; // Cuánto dinero falta por devolver a cada fondo
        let ventasGanancia = 0; // Excedente que va al fondo Ventas (id=4)
        
        let ventasDetalleGlobal = {
            total_prestado_fondos: 0,
            total_invertido_gastos: 0,
            total_recaudado: 0,
            ganancia_neta: 0,
            prestado_pendiente_por_fondo: {},
            por_evento: []
        };

        ventasEventos.forEach(ev => {
            const invertido = Number(ev.capital_invertido);
            const recuperado = Number(ev.capital_recuperado);

            // Obtener los fondos prestamistas de este evento
            const fondosEv = ventasFondosPrestamos.filter(fp => fp.evento_id === ev.id);
            const totalPrestado = fondosEv.reduce((s, fp) => s + Number(fp.monto_prestado), 0);

            ventasDetalleGlobal.total_prestado_fondos += totalPrestado;
            ventasDetalleGlobal.total_invertido_gastos += invertido;
            ventasDetalleGlobal.total_recaudado += recuperado;

            let detalleEvento = {
                id: ev.id,
                prestado: totalPrestado,
                recuperado: recuperado,
                ganancia: 0,
                faltante_por_devolver: 0
            };

            if (recuperado < totalPrestado) {
                // Aún no se recupera todo lo prestado: distribuir el déficit proporcional a cada fondo
                const falta = totalPrestado - recuperado;
                detalleEvento.faltante_por_devolver = falta;
                const ratio = totalPrestado > 0 ? falta / totalPrestado : 0;
                fondosEv.forEach(fp => {
                    const faltaFondo = Number(fp.monto_prestado) * ratio;
                    ventasPrestadoPorFondo[fp.fondo_id] = (ventasPrestadoPorFondo[fp.fondo_id] || 0) + faltaFondo;
                    ventasDetalleGlobal.prestado_pendiente_por_fondo[fp.fondo_id] = (ventasDetalleGlobal.prestado_pendiente_por_fondo[fp.fondo_id] || 0) + faltaFondo;
                });
            } else if (recuperado > totalPrestado) {
                // El préstamo ya se pagó, el excedente es ganancia del fondo Ventas
                const gananciaEvento = recuperado - totalPrestado;
                ventasGanancia += gananciaEvento;
                ventasDetalleGlobal.ganancia_neta += gananciaEvento;
                detalleEvento.ganancia = gananciaEvento;
            }
            
            ventasDetalleGlobal.por_evento.push(detalleEvento);
        });

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
        // 1 = Cuotas, 2 = Alcantarilla, 3 = Ganancias, 4 = Ventas
        const fuenteCuotas       = Number(cuotas.total) + Number(penalizaciones.total) - (mapaPrestado[1] || 0) - (mapaGastos[1] || 0) - (ventasPrestadoPorFondo[1] || 0);
        const fuenteAlcantarilla = recaudoNetoAlcantarilla - (mapaPrestado[2] || 0) - (mapaGastos[2] || 0) - (ventasPrestadoPorFondo[2] || 0);
        const fuenteIntereses    = Number(intereses.total) - (mapaPrestado[3] || 0) - (mapaGastos[3] || 0) - (ventasPrestadoPorFondo[3] || 0);
        const fuenteVentas       = ventasGanancia - (mapaPrestado[4] || 0) - (mapaGastos[4] || 0) - (ventasPrestadoPorFondo[4] || 0);

        const fondoTotalLíquido = fuenteCuotas + fuenteAlcantarilla + fuenteIntereses + fuenteVentas;
        const capitalEnLaCalle  = Object.values(mapaPrestado).reduce((a, b) => a + b, 0) + Object.values(ventasPrestadoPorFondo).reduce((a, b) => a + b, 0);
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
                intereses_prestamos: fuenteIntereses,
                ventas:            fuenteVentas,
                penalizaciones_total: Number(penalizaciones.total),
                penalizaciones_pendientes_monto: penalizacionesPendientesMonto,
                penalizaciones_pendientes_count: penalizacionesPendientesCount
            },
            metas:                 metasConMonto,
            deuda_total_pendiente: Number(deuda.total_deuda),
            capital_prestado_activo: capitalEnLaCalle,
            historico_fondos:      historial,
            historico_por_mes:     porMes,
            ventas_detalle:        ventasDetalleGlobal
        };
    }

    /**
     * Obtiene el historial detallado de movimientos para gráficas.
     */
    static async obtenerHistoricoFondos() {
        const query = `
            (SELECT 'ingreso_cuota' as tipo, monto as valor, fecha as fecha, 1 as fondo_id FROM pagos WHERE tipo_pago = 'cuota' OR tipo_pago IS NULL)
            UNION ALL
            (SELECT 'ingreso_penalizacion', monto, fecha, 1 FROM pagos WHERE tipo_pago = 'penalizacion')
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
            UNION ALL
            (SELECT 'gasto_ventas', -(g.precio * fp.monto_prestado / tot.total_prest), DATE(g.created_at), fp.fondo_id
             FROM ventas_gastos g
             JOIN ventas_fondos_prestamos fp ON fp.evento_id = g.evento_id
             JOIN (SELECT evento_id, SUM(monto_prestado) AS total_prest FROM ventas_fondos_prestamos GROUP BY evento_id) tot ON tot.evento_id = g.evento_id
             WHERE tot.total_prest > 0)
            UNION ALL
            (SELECT 'ingreso_ventas', monto_abonado, DATE(a.fecha_registro), 4 FROM ventas_abonos a)
            ORDER BY fecha ASC
        `;

        const [movimientos] = await conexion.query(query);

        // Agrupar por mes para gráficos limpios
        const historialPorMes = {};
        
        let balanceCuotas = 0;
        let balanceAlcantarilla = 0;
        let balanceGanancias = 0;
        let balanceVentas = 0;
        let balancePenalizaciones = 0;

        movimientos.forEach(m => {
            const mes = m.fecha ? new Date(m.fecha).toISOString().substring(0, 7) : 'Sin Fecha';
            
            const v = Number(m.valor);
            if (m.fondo_id === 1) {
                balanceCuotas += v;
                if (m.tipo === 'ingreso_penalizacion') balancePenalizaciones += v;
            }
            else if (m.fondo_id === 2) balanceAlcantarilla += v;
            else if (m.fondo_id === 3) balanceGanancias += v;
            else if (m.fondo_id === 4) balanceVentas += v;

            historialPorMes[mes] = {
                mes,
                cuotas: balanceCuotas,
                penalizaciones: balancePenalizaciones,
                alcantarilla: balanceAlcantarilla,
                ganancias: balanceGanancias,
                ventas: balanceVentas,
                total: balanceCuotas + balanceAlcantarilla + balanceGanancias + balanceVentas
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
        // personasActivas y pagosGlobales ya se consultaron arriba si estamos en la misma petición o podemos volver a consultarlos.
        // Pero para no causar colisiones de variables si se usa en otros lados, volvemos a declarar o reusamos.
        const [personasActivasRes] = await conexion.query('SELECT * FROM personas WHERE estado = "activo"');
        const [pagosGlobalesRes] = await conexion.query('SELECT * FROM pagos');
        
        let deudoresCuotas = [];
        for (const p of personasActivasRes) {
            const pagosPersona = pagosGlobalesRes.filter(pago => pago.persona_id === p.id);
            const estado = calcularEstado(p, pagosPersona);
            if (estado.es_moroso) {
                deudoresCuotas.push({
                    nombre: p.nombre,
                    quincenas_pendientes: estado.quincenas_en_mora.length,
                    quincenas_detalle: estado.quincenas_en_mora.join(', '),
                    cuota: p.cuota,
                    penalizacion: estado.penalizacion_sugerida,
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
                SELECT 
                    p.nombre, 
                    COALESCE(v.monto_pagado, 0) as pagado, 
                    COALESCE(v.unidades_vendidas, 0) as vendidas
                FROM alcantarilla_participantes ap
                JOIN personas p ON ap.persona_id = p.id
                LEFT JOIN alcantarilla_ventas v ON v.persona_id = p.id AND v.alcantarilla_id = ?
                WHERE ap.alcantarilla_id = ?
                  AND COALESCE(v.monto_pagado, 0) < (? * ?)
            `, [alc.id, alc.id, alc.tope_por_persona, alc.precio_boleta]);
            
            if (ventas.length > 0) {
                deudoresAlcantarilla.push({
                    alcantarilla: alc.nombre,
                    deudores: ventas.map(v => {
                        const meta = alc.tope_por_persona * alc.precio_boleta;
                        const deuda = meta - v.pagado;
                        return { 
                            nombre: v.nombre, 
                            faltantes: Math.max(0, Math.ceil(deuda / alc.precio_boleta)),
                            deuda_pesos: deuda
                        };
                    })
                });
            }
        }

        // 4.5 Deudores de Ventas (Eventos activos)
        const [eventosVentasActivos] = await conexion.query('SELECT * FROM ventas_eventos WHERE estado = "activo"');
        const deudoresVentas = [];
        let ventasTotalesRecaudo = 0;
        
        for (const ev of eventosVentasActivos) {
            const [asignaciones] = await conexion.query(`
                SELECT 
                    p.nombre, 
                    a.total_esperado,
                    COALESCE((SELECT SUM(monto_abonado) FROM ventas_abonos WHERE asignacion_id = a.id), 0) AS pagado
                FROM ventas_asignaciones a
                JOIN personas p ON a.persona_id = p.id
                WHERE a.evento_id = ?
            `, [ev.id]);
            
            const deudores = asignaciones
                .filter(a => a.pagado < a.total_esperado)
                .map(a => ({
                    nombre: a.nombre,
                    deuda_pesos: a.total_esperado - a.pagado
                }));
                
            if (deudores.length > 0) {
                deudoresVentas.push({
                    evento: ev.nombre,
                    deudores: deudores
                });
            }
        }

        const [[ventasAbonosTotales]] = await conexion.query('SELECT COALESCE(SUM(monto_abonado), 0) as total FROM ventas_abonos');
        ventasTotalesRecaudo = Number(ventasAbonosTotales.total);

        // 5. Consolidado por fondo (Resumen histórico)
        const [[cuotasTotal]] = await conexion.query(`SELECT COALESCE(SUM(monto), 0) AS subtotal FROM pagos WHERE tipo_pago = 'cuota' OR tipo_pago IS NULL`);
        const [[penalizacionesTotal]] = await conexion.query(`SELECT COALESCE(SUM(monto), 0) AS subtotal FROM pagos WHERE tipo_pago = 'penalizacion'`);
        const [[alcantarillaTotal]] = await conexion.query(`SELECT COALESCE(SUM(monto_pagado), 0) AS subtotal FROM alcantarilla_ventas`);
        const [[alcantarillaPremios]] = await conexion.query(`SELECT COALESCE(SUM(costo_premio), 0) AS subtotal FROM alcantarillas`);
        const [[interesTotal]] = await conexion.query(`SELECT COALESCE(SUM(interes_pagado), 0) AS subtotal FROM prestamo_abonos`);
        
        return {
            deudores_cuotas: deudoresCuotas,
            prestamos_activos: prestamosActivos,
            gastos: gastosDetalle,
            deudores_alcantarilla: deudoresAlcantarilla,
            deudores_ventas: deudoresVentas,
            totales_historicos: {
                cuotas: Number(cuotasTotal.subtotal),
                penalizaciones: Number(penalizacionesTotal.subtotal),
                alcantarilla: Number(alcantarillaTotal.subtotal),
                alcantarilla_premios: Number(alcantarillaPremios.subtotal),
                ganancias: Number(interesTotal.subtotal),
                ventas: ventasTotalesRecaudo
            }
        };
    }
}

module.exports = BancoModelo;
