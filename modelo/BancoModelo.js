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

        // 4. Capital prestado actualmente en la calle (agrupado por fuente)
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
        const fuenteCuotas      = Number(cuotas.total) - (mapaPrestado['cuotas'] || 0);
        const fuenteAlcantarilla = recaudoNetoAlcantarilla - (mapaPrestado['alcantarilla'] || 0);
        const fuenteIntereses   = Number(intereses.total) - (mapaPrestado['ganancias'] || 0);

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
            historico_por_mes:     porMes
        };
    }
}

module.exports = BancoModelo;
