import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-CO')}`;

export const generateReporteVentas = (evento, gastos, asignaciones, abonos) => {
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Colores corporativos
    const cGreen = [16, 185, 129];
    const cDark = [15, 23, 42];
    const cWarning = [245, 158, 11];

    doc.setFillColor(...cDark);
    doc.rect(0, 0, W, 40, 'F');

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...cGreen);
    doc.text('REPORTE DE EVENTO: VENTAS', margin, 20);

    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text(`Evento: ${evento.nombre.toUpperCase()}`, margin, 28);
    doc.text(`Fecha: ${new Date(evento.fecha).toLocaleDateString()}`, margin, 34);
    
    doc.text(`Fondo Prestatario: ${evento.fondo_origen_nombre.toUpperCase()}`, W - margin, 28, { align: 'right' });
    
    let y = 50;

    // 1. Resumen Presupuesto e Inversión
    doc.setFontSize(14);
    doc.setTextColor(...cDark);
    doc.text('1. PRESUPUESTO INICIAL (PRÉSTAMO INTERNO)', margin, y);
    y += 8;

    autoTable(doc, {
        startY: y,
        head: [['CONCEPTO / INGREDIENTE', 'COSTO']],
        body: gastos.length > 0 ? gastos.map(g => [g.concepto, fmt(g.precio)]) : [['Sin gastos', '$0']],
        foot: [['TOTAL INVERTIDO', fmt(evento.total_invertido)]],
        theme: 'striped',
        headStyles: { fillColor: cWarning },
        footStyles: { fillColor: cDark, textColor: [255,255,255] },
        columnStyles: { 1: { halign: 'right' } }
    });
    
    y = doc.lastAutoTable.finalY + 15;

    // 2. Estado de Cuentas por Integrante
    doc.setFontSize(14);
    doc.text('2. ESTADO DE CUENTAS POR INTEGRANTE', margin, y);
    y += 8;

    const dataAsig = asignaciones.map(a => {
        const pagado = Number(a.total_abonado);
        const meta = Number(a.total_esperado);
        const debe = Math.max(0, meta - pagado);
        return [
            a.persona_nombre,
            `${a.cantidad_productos} x ${fmt(a.precio_unidad)}`,
            fmt(meta),
            fmt(pagado),
            fmt(debe)
        ];
    });

    autoTable(doc, {
        startY: y,
        head: [['INTEGRANTE', 'ASIGNACIÓN', 'META ESPERADA', 'RECAUDADO', 'SALDO PENDIENTE']],
        body: dataAsig.length > 0 ? dataAsig : [['No hay integrantes asignados', '', '', '', '']],
        theme: 'grid',
        headStyles: { fillColor: cGreen },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] } }
    });

    y = doc.lastAutoTable.finalY + 15;

    // 3. Balance General
    const invertido = Number(evento.total_invertido);
    const recuperado = Number(evento.total_recuperado);
    const metaG = Number(evento.total_meta);
    const ganancia = Math.max(0, recuperado - invertido);
    const faltantePrestamo = Math.max(0, invertido - recuperado);

    if (y > 220) { doc.addPage(); y = 20; }
    
    doc.setFontSize(14);
    doc.setTextColor(...cDark);
    doc.text('3. BALANCE GENERAL DEL EVENTO', margin, y);
    y += 8;

    autoTable(doc, {
        startY: y,
        head: [['INDICADOR', 'VALOR']],
        body: [
            ['Total Esperado en Ventas (Meta)', fmt(metaG)],
            ['Capital Prestado (A devolver)', fmt(invertido)],
            ['Dinero Recaudado Físicamente', fmt(recuperado)],
            ['Préstamo Pendiente por Devolver', faltantePrestamo > 0 ? fmt(faltantePrestamo) : 'COMPLETADO'],
            ['Ganancia Neta (Utilidad)', fmt(ganancia)]
        ],
        theme: 'plain',
        headStyles: { fillColor: false, textColor: cDark, fontStyle: 'bold', lineWidth: { bottom: 0.5 } },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
    });

    doc.save(`VDR_EVENTO_${evento.nombre.replace(/\s+/g, '_').toUpperCase()}.pdf`);
};
