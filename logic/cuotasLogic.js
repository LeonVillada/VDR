// Función para calcular cuántas quincenas HAN VENCIDO hasta la fecha actual
// Regla usuario: "La 1ra quincena de Enero no cuenta. Se empieza desde la 2da de Enero."
// Regla: Si se ingresa el 15 paga Q1. Si entra el 16, paga Q2.
// Para esto definimos el "fin" de la quincena. Si la persona ingresó en o antes del fin de la quincena,
// y esa quincena ya VenciÓ, entonces la debe.
function calcularQuincenasVencidas(fechaReferencia = new Date(), fechaIngresoPersona = new Date('2026-01-01')) {
    const hoy = new Date(fechaReferencia);
    const ingresoStr = typeof fechaIngresoPersona === 'string' ? fechaIngresoPersona.split('T')[0] : fechaIngresoPersona.toISOString().split('T')[0];
    const ingreso = new Date(`${ingresoStr}T00:00:00`); // Aseguramos que sea al inicio del día, en tz local/UTC neutral
    const anio = 2026; // El sistema es para 2026

    // Lista de fechas de corte (Vencimientos) y el último día de ese periodo (fin)
    const periodos = [
        { q: "Q2 Enero", vence: new Date(anio, 1, 16), fin: new Date(anio, 0, 31, 23, 59, 59) }, 
        { q: "Q1 Febrero", vence: new Date(anio, 2, 1), fin: new Date(anio, 1, 15, 23, 59, 59) }, 
        { q: "Q2 Febrero", vence: new Date(anio, 2, 16), fin: new Date(anio, 1, 28, 23, 59, 59) }, 
        { q: "Q1 Marzo", vence: new Date(anio, 3, 1), fin: new Date(anio, 2, 15, 23, 59, 59) }, 
        { q: "Q2 Marzo", vence: new Date(anio, 3, 16), fin: new Date(anio, 2, 31, 23, 59, 59) }, 
        { q: "Q1 Abril", vence: new Date(anio, 4, 1), fin: new Date(anio, 3, 15, 23, 59, 59) },
        { q: "Q2 Abril", vence: new Date(anio, 4, 16), fin: new Date(anio, 3, 30, 23, 59, 59) },
        { q: "Q1 Mayo", vence: new Date(anio, 5, 1), fin: new Date(anio, 4, 15, 23, 59, 59) },
        { q: "Q2 Mayo", vence: new Date(anio, 5, 16), fin: new Date(anio, 4, 31, 23, 59, 59) },
        { q: "Q1 Junio", vence: new Date(anio, 6, 1), fin: new Date(anio, 5, 15, 23, 59, 59) },
        { q: "Q2 Junio", vence: new Date(anio, 6, 16), fin: new Date(anio, 5, 30, 23, 59, 59) },
        { q: "Q1 Julio", vence: new Date(anio, 7, 1), fin: new Date(anio, 6, 15, 23, 59, 59) },
        { q: "Q2 Julio", vence: new Date(anio, 7, 16), fin: new Date(anio, 6, 31, 23, 59, 59) },
        { q: "Q1 Agosto", vence: new Date(anio, 8, 1), fin: new Date(anio, 7, 15, 23, 59, 59) },
        { q: "Q2 Agosto", vence: new Date(anio, 8, 16), fin: new Date(anio, 7, 31, 23, 59, 59) },
        { q: "Q1 Septiembre", vence: new Date(anio, 9, 1), fin: new Date(anio, 8, 15, 23, 59, 59) },
        { q: "Q2 Septiembre", vence: new Date(anio, 9, 16), fin: new Date(anio, 8, 30, 23, 59, 59) },
        { q: "Q1 Octubre", vence: new Date(anio, 10, 1), fin: new Date(anio, 9, 15, 23, 59, 59) },
        { q: "Q2 Octubre", vence: new Date(anio, 10, 16), fin: new Date(anio, 9, 31, 23, 59, 59) },
        { q: "Q1 Noviembre", vence: new Date(anio, 11, 1), fin: new Date(anio, 10, 15, 23, 59, 59) },
        { q: "Q2 Noviembre", vence: new Date(anio, 11, 16), fin: new Date(anio, 10, 30, 23, 59, 59) },
        { q: "Q1 Diciembre", vence: new Date(anio, 11, 31), fin: new Date(anio, 11, 15, 23, 59, 59) }, 
        { q: "Q2 Diciembre", vence: new Date(2027, 0, 16), fin: new Date(anio, 11, 31, 23, 59, 59) }
    ];

    let contadorVencidas = 0;
    for (const p of periodos) {
        if (ingreso <= p.fin && hoy >= p.vence) {
            contadorVencidas++;
        }
    }
    return contadorVencidas;
}

function calcularEstado(persona, pagos) {
    const fechaIngresoStr = typeof persona.fecha_ingreso === 'string' ? persona.fecha_ingreso.split('T')[0] : persona.fecha_ingreso.toISOString().split('T')[0];
    const fechaIngreso = new Date(`${fechaIngresoStr}T00:00:00`);
    const hoy = new Date();
    const dia = hoy.getDate();
    const mes = hoy.getMonth(); // 0-11
    const anio = 2026;

    // 1. Definimos los periodos completos
    const periodos = [
        { q: "Q2 Enero", fin: new Date(anio, 0, 31, 23, 59, 59) },
        { q: "Q1 Febrero", fin: new Date(anio, 1, 15, 23, 59, 59) },
        { q: "Q2 Febrero", fin: new Date(anio, 1, 28, 23, 59, 59) },
        { q: "Q1 Marzo", fin: new Date(anio, 2, 15, 23, 59, 59) },
        { q: "Q2 Marzo", fin: new Date(anio, 2, 31, 23, 59, 59) },
        { q: "Q1 Abril", fin: new Date(anio, 3, 15, 23, 59, 59) },
        { q: "Q2 Abril", fin: new Date(anio, 3, 30, 23, 59, 59) },
        { q: "Q1 Mayo", fin: new Date(anio, 4, 15, 23, 59, 59) },
        { q: "Q2 Mayo", fin: new Date(anio, 4, 31, 23, 59, 59) },
        { q: "Q1 Junio", fin: new Date(anio, 5, 15, 23, 59, 59) },
        { q: "Q2 Junio", fin: new Date(anio, 5, 30, 23, 59, 59) },
        { q: "Q1 Julio", fin: new Date(anio, 6, 15, 23, 59, 59) },
        { q: "Q2 Julio", fin: new Date(anio, 6, 31, 23, 59, 59) },
        { q: "Q1 Agosto", fin: new Date(anio, 7, 15, 23, 59, 59) },
        { q: "Q2 Agosto", fin: new Date(anio, 7, 31, 23, 59, 59) },
        { q: "Q1 Septiembre", fin: new Date(anio, 8, 15, 23, 59, 59) },
        { q: "Q2 Septiembre", fin: new Date(anio, 8, 30, 23, 59, 59) },
        { q: "Q1 Octubre", fin: new Date(anio, 9, 15, 23, 59, 59) },
        { q: "Q2 Octubre", fin: new Date(anio, 9, 31, 23, 59, 59) },
        { q: "Q1 Noviembre", fin: new Date(anio, 10, 15, 23, 59, 59) },
        { q: "Q2 Noviembre", fin: new Date(anio, 10, 30, 23, 59, 59) },
        { q: "Q1 Diciembre", fin: new Date(anio, 11, 15, 23, 59, 59) },
        { q: "Q2 Diciembre", fin: new Date(anio, 11, 31, 23, 59, 59) }
    ];

    // 2. Determinar la última quincena OBLIGATORIA (LMQI)
    let lmqi = -1;
    if (dia >= 20) {
        lmqi = (mes * 2) - 1;
    } else if (dia >= 5) {
        lmqi = (mes - 1) * 2;
    } else {
        lmqi = ((mes - 1) * 2) - 1;
    }

    // 3. Quincenas personalizadas del usuario (desde su ingreso)
    const quincenasUsuario = periodos.filter(p => fechaIngreso <= p.fin);

    // 4. Calcular cobro real
    const totalPagado = Array.isArray(pagos) ? pagos.reduce((sum, p) => sum + (p.monto || 0), 0) : 0;
    const cuotaFija = persona.cuota || 10000;
    const quincenasCubiertas = Math.floor(totalPagado / cuotaFija);

    // 5. Identificar quincenas en MORA real
    // Son las de la lista 'quincenasUsuario' que NO están cubiertas por 'quincenasCubiertas'
    // Y que además tienen un índice global <= lmqi
    let quincenasEnMora = [];
    quincenasUsuario.forEach((p, index) => {
        const globalIndex = periodos.findIndex(x => x.q === p.q);
        const isPaid = index < quincenasCubiertas;
        const isMandatory = globalIndex <= lmqi;

        if (!isPaid && isMandatory) {
            quincenasEnMora.push(p.q);
        }
    });

    // 6. Cálculo de Penalización basado en la Mora Real
    const quincenasVencidasCount = calcularQuincenasVencidas(hoy, fechaIngreso);
    let penalizacion = (quincenasEnMora.length >= 2) ? 5000 : 0;

    // EL total deuda ahora se basa en las que realmente están en mora + penalización
    const totalDeudaReal = (quincenasEnMora.length * cuotaFija) + penalizacion;

    return {
        quincenas_pendientes: quincenasEnMora.length,
        penalizacion_sugerida: penalizacion,
        total_deuda: totalDeudaReal,
        quincenas_pagadas: quincenasCubiertas,
        quincenas_vencidas: quincenasVencidasCount,
        es_moroso: quincenasEnMora.length > 0,
        quincenas_en_mora: quincenasEnMora
    };
}

module.exports = { calcularEstado, calcularQuincenasVencidas };
