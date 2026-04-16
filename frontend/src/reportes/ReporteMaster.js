import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-CO')}`;

const loadImg = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
};

export const generateMasterPDF = async (data, banco) => {
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Colores corporativos
    const cGreen = [16, 185, 129];
    const cGrey = [100, 110, 120];
    const cWhite = [255, 255, 255];
    const cDark = [15, 23, 42];

    let logoBase64 = null;
    try {
        const res = await fetch('/assets/verdaderos-logo.png');
        const blob = await res.blob();
        logoBase64 = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    } catch (e) { console.warn('Logo no cargado', e); }

    const drawPageAesthetics = (docInstance) => {
        // Marca de agua central (Logo Verdaderos con baja opacidad)
        if (logoBase64) {
            docInstance.saveGraphicsState();
            docInstance.setGState(new docInstance.GState({ opacity: 0.05 }));
            docInstance.addImage(logoBase64, 'PNG', W/2 - 60, H/2 - 30, 120, 35, undefined, 'FAST');
            docInstance.restoreGraphicsState();
        }
        
        // Header decorativo
        docInstance.setFillColor(...cDark);
        docInstance.rect(0, 0, W, 45, 'F');
        
        if (logoBase64) {
            docInstance.addImage(logoBase64, 'PNG', margin, 8, 55, 16);
        }

        docInstance.setFontSize(22);
        docInstance.setFont('helvetica', 'bold');
        docInstance.setTextColor(...cGreen);
        docInstance.text('REPORTE MAESTRO', W - margin, 20, { align: 'right' });
        
        docInstance.setFontSize(8);
        docInstance.setFont('helvetica', 'normal');
        docInstance.setTextColor(180, 180, 180);
        docInstance.text(`EMISIÓN: ${new Date().toLocaleString()}`, W - margin, 28, { align: 'right' });
        docInstance.text(`PATRIMONIO: ${fmt(banco.fondo_patrimonial)}`, W - margin, 34, { align: 'right' });
        
        // Línea verde separadora
        docInstance.setDrawColor(...cGreen);
        docInstance.setLineWidth(1);
        docInstance.line(margin, 45, W - margin, 45);
    };

    drawPageAesthetics(doc);

    let y = 60;

    // Cálculos de desglose
    const gastosCuotas = data.gastos.filter(g => g.fondo_id === 1).reduce((s, g) => s + Number(g.precio), 0);
    const prestadoCuotas = data.prestamos_activos.filter(p => p.fuente_id === 1 || !p.fuente_id).reduce((s, p) => s + (p.monto_original - p.total_abonado), 0);
    const cuotasPendientesTotal = data.deudores_cuotas.reduce((sum, d) => sum + Number(d.monto_deuda), 0);
    
    // El 'monto_original - total_abonado' es el capital pendiente en la calle.
    
    const premiosAlcantarilla = data.totales_historicos.alcantarilla_premios || 0;
    const alcantarillaPendientesTotal = data.deudores_alcantarilla.reduce((sum, alc) => {
        return sum + alc.deudores.reduce((s, d) => s + d.deuda_pesos, 0);
    }, 0);
    
    const interesEsperado = data.prestamos_activos.reduce((s, p) => s + Number(p.interes_cobrado), 0);
    const sumaPendientes = cuotasPendientesTotal + alcantarillaPendientesTotal + interesEsperado + prestadoCuotas;
    const granTotalGeneral = sumaPendientes + banco.fondo_total;

    // --- 1. RESUMEN GLOBAL ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...cDark);
    doc.text('1. RESUMEN GLOBAL DE FONDOS', margin, y);
    y += 8;

    autoTable(doc, {
        startY: y,
        head: [['FONDO', 'DESGLOSE DE SALDOS', 'CANTIDAD', 'DISPONIBLE EN CAJA']],
        body: [
            [
                { content: 'CUOTAS QUINCENALES', rowSpan: 3, styles: { valign: 'middle', fontStyle: 'bold' } },
                'Total Recaudado Histórico', fmt(data.totales_historicos.cuotas), 
                { content: fmt(banco.fuentes.cuotas), rowSpan: 3, styles: { valign: 'middle', fontStyle: 'bold', halign: 'right' } }
            ],
            ['Total Gastos Deducidos', `-${fmt(gastosCuotas)}`, ''],
            ['Capital Prestado', `-${fmt(prestadoCuotas)}`, ''],
            
            [
                { content: 'LA ALCANTARILLA', rowSpan: 3, styles: { valign: 'middle', fontStyle: 'bold' } },
                'Recaudo Total Histórico', fmt(data.totales_historicos.alcantarilla),
                { content: fmt(banco.fuentes.alcantarilla), rowSpan: 3, styles: { valign: 'middle', fontStyle: 'bold', halign: 'right' } }
            ],
            ['Premios y Gastos Descontados', `-${fmt(premiosAlcantarilla)}`, ''],
            ['Cartera por Cobrar (Deuda)', `+${fmt(alcantarillaPendientesTotal)} a favor`, ''],

            [
                { content: 'FONDO PRÉSTAMOS E INTERESES', rowSpan: 2, styles: { valign: 'middle', fontStyle: 'bold' } },
                'Intereses Esperados (Pendientes)', `+${fmt(interesEsperado)}`,
                { content: fmt(banco.fuentes.intereses_prestamos), rowSpan: 2, styles: { valign: 'middle', fontStyle: 'bold', halign: 'right', textColor: cGreen } }
            ],
            ['Intereses Netos Recaudados', fmt(data.totales_historicos.ganancias), ''],
            
            [
                { content: 'GRAN TOTAL CERRADO', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', valign: 'middle', fillColor: cDark, textColor: cWhite } },
                { content: `Por recuperar:\n${fmt(sumaPendientes)}`, styles: { halign: 'right', fontStyle: 'bold', valign: 'middle', fillColor: [240, 240, 240], textColor: [220, 38, 38] } },
                { content: `Caja Real:\n${fmt(banco.fondo_total)}`, styles: { halign: 'right', fontStyle: 'bold', valign: 'middle', fillColor: [209, 250, 229], textColor: [4, 120, 87] } }
            ],
            [
                { content: 'PATRIMONIO GLOBAL TOTAL (Por Recuperar + Caja Real)', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', valign: 'middle', fillColor: [226, 232, 240], textColor: cDark } },
                { content: fmt(granTotalGeneral), styles: { halign: 'right', fontStyle: 'bold', valign: 'middle', fillColor: [187, 247, 208], textColor: [4, 120, 87] } }
            ]
        ],
        theme: 'grid',
        headStyles: { fillColor: cGreen, textColor: cWhite, halign: 'center' },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 2: { halign: 'right' } }
    });
    
    y = doc.lastAutoTable.finalY + 15;

    // --- 2. DEUDORES CUOTAS ---
    if (data.deudores_cuotas && data.deudores_cuotas.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...cDark);
        doc.text('2. INTEGRANTES CON MORA (CUOTAS)', margin, y);
        y += 8;

        autoTable(doc, {
            startY: y,
            head: [['NOMBRE INTEGRANTE', 'QUINCENAS PENDIENTES', 'TOTAL DEUDA']],
            body: data.deudores_cuotas.map(d => [
                d.nombre.toUpperCase(), 
                d.quincenas_detalle ? d.quincenas_detalle.toUpperCase() : `${d.quincenas_pendientes} Qs`, 
                fmt(d.monto_deuda)
            ]),
            theme: 'striped',
            headStyles: { fillColor: [239, 68, 68] },
            styles: { fontSize: 8 },
            columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right', fontStyle: 'bold' } }
        });
        y = doc.lastAutoTable.finalY + 15;
    }

    // --- 3. PRÉSTAMOS ACTIVOS ---
    if (y > 220) { doc.addPage(); drawPageAesthetics(doc); y = 60; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...cDark);
    doc.text('3. DETALLE DE PRÉSTAMOS ACTIVOS', margin, y);
    y += 8;

    autoTable(doc, {
        startY: y,
        head: [['FECHA', 'RESPONSABLE', 'ORIGINAL', 'INTERÉS', 'SALDO PENDIENTE']],
        body: data.prestamos_activos.map(p => [
            new Date(p.fecha_prestamo).toLocaleDateString(),
            p.responsable ? p.responsable.toUpperCase() : 'N/A',
            fmt(p.monto_original),
            fmt(p.interes_cobrado),
            fmt(p.saldo_pendiente)

        ]),
        headStyles: { fillColor: cGreen },
        styles: { fontSize: 8 },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } }
    });
    
    y = doc.lastAutoTable.finalY + 15;

    // --- 4. DEUDORES ALCANTARILLA ---
    if (data.deudores_alcantarilla && data.deudores_alcantarilla.length > 0) {
        if (y > 200) { doc.addPage(); drawPageAesthetics(doc); y = 60; }
        doc.setFontSize(14);
        doc.text('4. DEUDORES DE ALCANTARILLA', margin, y);
        y += 8;

        data.deudores_alcantarilla.forEach(alc => {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...cGreen);
            doc.text(`Evento: ${alc.alcantarilla.toUpperCase()}`, margin, y);
            y += 5;
            
            autoTable(doc, {
                startY: y,
                head: [['NOMBRE INTEGRANTE', 'VALOR ESTIMADO']],
                body: alc.deudores.map(d => [d.nombre.toUpperCase(), fmt(d.deuda_pesos)]),
                theme: 'plain',
                styles: { fontSize: 8, textColor: [50, 50, 50] },
                headStyles: { fillColor: false, textColor: cDark, fontStyle: 'bold', lineWidth: { bottom: 0.5 } },
                columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
            });
            y = (doc.lastAutoTable?.finalY || y) + 12;
        });
    }

    // --- 5. GASTOS ---
    if (y > 200) { doc.addPage(); drawPageAesthetics(doc); y = 60; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...cDark);
    doc.text('5. REGISTRO DE GASTOS Y FACTURAS', margin, y);
    y += 8;

    autoTable(doc, {
        startY: y,
        head: [['FECHA', 'EVENTO / CONCEPTO', 'PRECIO', 'OBSERVACIONES']],
        body: data.gastos.map(g => [
            new Date(g.created_at).toLocaleDateString(),
            g.evento.toUpperCase(),
            fmt(g.precio),
            g.observaciones || '-'
        ]),
        headStyles: { fillColor: [71, 85, 105] },
        styles: { fontSize: 8 },
        columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } }
    });

    // --- 6. ANEXOS / IMÁGENES DE GASTOS ---
    const gastosConImagen = data.gastos.filter(g => g.imagenes);
    if (gastosConImagen.length > 0) {
        // Cargar todas las imagenes primero
        const imagenesCargadas = [];
        for (const g of gastosConImagen) {
            const arrayArchivos = g.imagenes.split(',');
            for (let i = 0; i < arrayArchivos.length; i++) {
                const imgStr = arrayArchivos[i].trim();
                if (!imgStr) continue;

                try {
                    let imgUrl = imgStr.startsWith('http') ? imgStr : `${api.defaults.baseURL.replace('/api', '')}/uploads/${imgStr}`;
                    
                    const res = await fetch(imgUrl);
                    if (res.ok) {
                        const blob = await res.blob();
                        const b64 = await new Promise(resolve => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(blob);
                        });
                        
                        const ext = blob.type.split('/')[1] || 'PNG';
                        const format = ext.toUpperCase() === 'JPEG' ? 'JPEG' : 'PNG';

                        const suffix = arrayArchivos.length > 1 ? ` (Foto ${i+1})` : '';
                        imagenesCargadas.push({ evento: g.evento + suffix, b64, format });
                    }
                } catch (err) {
                    console.warn('No se pudo cargar la imagen del gasto:', g.evento, err);
                }
            }
        }

        if (imagenesCargadas.length > 0) {
            doc.addPage();
            drawPageAesthetics(doc);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...cDark);
            doc.text('6. ANEXOS FOTOGRÁFICOS', margin, 60);

            let xObj = margin;
            let yObj = 70;
            const imgW = (W - (margin * 2) - 10) / 2;
            const imgH = 90; // Fixed consistent height

            for (let i = 0; i < imagenesCargadas.length; i++) {
                const imgData = imagenesCargadas[i];
                
                if (yObj + imgH + 10 > H - 20) {
                    doc.addPage();
                    drawPageAesthetics(doc);
                    xObj = margin;
                    yObj = 60;
                }

                doc.setFontSize(8);
                doc.setTextColor(...cGreen);
                const label = imgData.evento.length > 40 ? imgData.evento.substring(0, 37) + '...' : imgData.evento;
                doc.text(label.toUpperCase(), xObj, yObj - 3);

                try {
                    doc.addImage(imgData.b64, imgData.format, xObj, yObj, imgW, imgH, undefined, 'FAST');
                } catch(e) {
                    doc.setTextColor(255, 0, 0);
                    doc.text('Error de formato', xObj, yObj + 10);
                }

                if (i % 2 === 0) {
                    xObj += imgW + 10;
                } else {
                    xObj = margin;
                    yObj += imgH + 15;
                }
            }
        }
    }

    // Footer en todas las páginas
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...cGrey);
        doc.text(`Página ${i} de ${pages} - VDRSOFTWARE - Reporte Confidencial`, W / 2, H - 10, { align: 'center' });
    }

    doc.save(`VDR_MAESTRO_${new Date().toISOString().split('T')[0]}.pdf`);
};
