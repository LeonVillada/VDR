import React, { useEffect, useState } from 'react';
import { CreditCard, Search, Plus, Trash2, Download, FileText } from 'lucide-react';
import { pagosApi, personasApi } from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Pagos = () => {
    const [pagos, setPagos] = useState([]);
    const [personas, setPersonas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedPersona, setSelectedPersona] = useState('');
    const [showOnlyMorosos, setShowOnlyMorosos] = useState(false);
    const [formData, setFormData] = useState({ persona_id: '', monto: '', fecha: new Date().toISOString().split('T')[0], quincena: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [pagosRes, personasRes] = await Promise.all([
                pagosApi.getAll(),
                personasApi.getAll()
            ]);
            setPagos(pagosRes.data);
            const sortedPersonas = personasRes.data.sort((a, b) => a.nombre.localeCompare(b.nombre));
            setPersonas(sortedPersonas);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await pagosApi.create(formData);
            setShowModal(false);
            setFormData({ persona_id: '', monto: '', fecha: new Date().toISOString().split('T')[0], quincena: '' });
            fetchData();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Eliminar este registro de pago?')) {
            try {
                await pagosApi.delete(id);
                fetchData();
            } catch (err) { console.error(err); }
        }
    };

    const [selectedQuincena, setSelectedQuincena] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const clearFilters = () => {
        setSelectedPersona('');
        setSelectedQuincena('');
        setStartDate('');
        setEndDate('');
        setShowOnlyMorosos(false);
    };

    const generatePDF = () => {
        const doc = new jsPDF();

        // Cargar imagen para uso posterior
        const img = new Image();
        img.src = '/assets/verdaderos-logo.png';

        // --- COLORES CORPORATIVOS (SOLO VERDE, NEGRO, BLANCO, GRIS) ---
        const colorPrimary = [16, 185, 129];   // Verde VDR
        const colorBlack = [20, 20, 20];       // Negro Header
        const colorDarkGrey = [60, 60, 60];    // Texto Oscuro
        const colorLightGrey = [240, 240, 240];// Fondos Claros
        const colorWhite = [255, 255, 255];    // Blanco


        // --- CÁLCULOS TIPO DASHBOARD ---
        const totalGlobal = pagos.reduce((sum, p) => sum + p.monto, 0);

        let deudoresReales = 0;
        let totalDeudaCalculada = 0;

        // Ahora confiamos en lo que envía el backend en su estado completo (`personas` viene con `quincenas_pendientes` etc)
        personas.forEach(p => {
            if (p.es_moroso) {
                deudoresReales++;
                totalDeudaCalculada += p.total_deuda;
            } else if (p.quincenas_pendientes > 0) {
                // Si tiene pendientes pero no es moroso aun (dentro de los 5 dias), sumamos a deuda total pero no a deudores reales en mora
                totalDeudaCalculada += p.total_deuda;
            }
        });

        // Calculamos objetivo general: La sumatoria de las expectativas maxs (o aproximado para el total)
        // Para simplificar, la meta anual global sería el total de la expectativa individual de cada persona
        // (número de quincenas que estará activa en el año * cuota).
        // Pero tradicionalmente el dashboard lo mantenía fijo: 
        const QUINCENAS_ANUALES = 23;
        const CUOTA_QUINCENAL = 10000;
        const META_OBJETIVO = personas.length * CUOTA_QUINCENAL * QUINCENAS_ANUALES;
        const porcentajeMeta = META_OBJETIVO > 0 ? Math.min((totalGlobal / META_OBJETIVO) * 100, 100).toFixed(1) : 0;
        const eficiencia = totalGlobal + totalDeudaCalculada > 0 ? ((totalGlobal / (totalGlobal + totalDeudaCalculada)) * 100).toFixed(1) : 0;

        // --- ENCABEZADO PREMIUM ---
        doc.setFillColor(...colorBlack);
        doc.rect(0, 0, 210, 50, 'F');

        doc.setTextColor(...colorWhite);
        doc.setFontSize(26);
        doc.setFont('helvetica', 'bold');
        doc.text('VDRSOFTWARE', 15, 25);

        let reporteTitulo = 'REPORTE FINANCIERO';
        if (selectedQuincena) reporteTitulo += ` - ${selectedQuincena.toUpperCase()}`;
        else if (startDate && endDate) reporteTitulo += ` - ENTRE ${startDate} Y ${endDate}`;
        else reporteTitulo += ' - HISTÓRICO GENERAL';

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colorPrimary);
        doc.text(reporteTitulo, 15, 35);

        doc.setTextColor(150, 150, 150);
        doc.setFontSize(9);
        doc.text('Generado por Sistema de Gestión Integrada', 195, 20, { align: 'right' });
        doc.text(new Date().toLocaleString('es-CO'), 195, 30, { align: 'right' });

        // --- TARJETAS ---
        let cardsY = 65;
        const cardWidth = 55;
        const cardHeight = 30;
        const cardGap = 10;
        const startX = 15;

        const drawCard = (x, title, value, footer) => {
            doc.setFillColor(200, 200, 200);
            doc.roundedRect(x + 1, cardsY + 1, cardWidth, cardHeight, 3, 3, 'F');
            doc.setFillColor(...colorWhite);
            doc.roundedRect(x, cardsY, cardWidth, cardHeight, 3, 3, 'F');
            doc.setDrawColor(...colorPrimary);
            doc.setLineWidth(1);
            doc.line(x, cardsY, x + cardWidth, cardsY);

            doc.setFontSize(9);
            doc.setTextColor(...colorDarkGrey);
            doc.text(title, x + 5, cardsY + 10);

            doc.setFontSize(14);
            doc.setTextColor(...colorBlack);
            doc.setFont('helvetica', 'bold');
            doc.text(value, x + 5, cardsY + 20);

            if (footer) {
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...colorPrimary);
                doc.text(footer, x + 5, cardsY + 26);
            }
        };

        drawCard(startX, 'Recaudo Total (Global)', `$${totalGlobal.toLocaleString()}`, `${eficiencia}% Eficiencia`);
        drawCard(startX + cardWidth + cardGap, 'Deuda Pendiente', `$${totalDeudaCalculada.toLocaleString()}`, `${deudoresReales} Miembros en mora*`);
        drawCard(startX + (cardWidth + cardGap) * 2, 'Total Esperado (2026)', `$${META_OBJETIVO.toLocaleString()}`, 'Proyección Anual');

        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('*Mora: Q1 Ene excluida. Cortes: 1 y 16 de cada mes (Total 23).', startX + cardWidth + cardGap, cardsY + cardHeight + 5);

        // --- BARRA ---
        const progressY = cardsY + cardHeight + 15;
        doc.setFontSize(10);
        doc.setTextColor(...colorBlack);
        doc.text(`Progreso de Meta Anual (23 Quincenas): ${porcentajeMeta}%`, 15, progressY);

        doc.setFillColor(220, 220, 220);
        doc.roundedRect(15, progressY + 3, 180, 6, 2, 2, 'F');
        doc.setFillColor(...colorPrimary);
        const progressWidth = Math.min((porcentajeMeta / 100) * 180, 180);
        doc.roundedRect(15, progressY + 3, progressWidth, 6, 2, 2, 'F');

        // --- TABLA 1: REGISTROS DE PAGO ---
        const tableStartY = progressY + 20;
        const tableColumn = ["INTEGRANTE", "MONTO", "FECHA PAGO", "REFERENCIA / QUINCENA"];
        const tableRows = filteredPagos.map(p => [
            p.persona_nombre.toUpperCase(),
            `$${p.monto.toLocaleString()}`,
            new Date(p.fecha).toLocaleDateString('es-CO'),
            (p.quincena || 'S/R').toUpperCase()
        ]);

        const totalFiltrado = filteredPagos.reduce((sum, p) => sum + p.monto, 0);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: tableStartY,
            theme: 'grid',
            headStyles: { fillColor: colorBlack, textColor: colorWhite, fontSize: 9, fontStyle: 'bold', halign: 'center' },
            styles: { fontSize: 8, cellPadding: 3, textColor: colorDarkGrey },
            alternateRowStyles: { fillColor: colorLightGrey }
        });

        const finalY = (doc).lastAutoTable.finalY + 2;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL RECAUDADO (SEGÚN FILTRO): $${totalFiltrado.toLocaleString()}`, 15, finalY + 5);

        // --- TABLA 2: ESTADO DE CUENTAS PENDIENTES / MOROSOS (Solo si el filtro está activo) ---
        if (showOnlyMorosos) {
            let nextY = finalY + 15;
            // "Global siempre todos" - mostramos todos los deudores críticos
            let deudores = personas.filter(p => p.es_moroso);

            if (deudores.length > 0) {
                if (nextY > 240) { doc.addPage(); nextY = 20; }

                doc.setFontSize(11);
                doc.setTextColor(...colorBlack);
                doc.setFont('helvetica', 'bold');
                doc.text('RESUMEN GLOBAL DE INTEGRANTES MOROSOS', 15, nextY);
                doc.setDrawColor(...colorPrimary);
                doc.setLineWidth(0.5);
                doc.line(15, nextY + 1.5, 105, nextY + 1.5);

                doc.setFontSize(8);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(100, 100, 100);
                doc.text('* Esta lista incluye a todos los integrantes con deudas obligatorias a la fecha.', 15, nextY + 6);

                const deudoresRows = deudores.map(d => [
                    d.nombre,
                    d.quincenas_en_mora && d.quincenas_en_mora.length > 0 
                        ? d.quincenas_en_mora.join(', ') 
                        : (d.es_moroso ? 'MOROSO' : 'SIN MORA'),
                    `$${d.total_deuda.toLocaleString()}`
                ]);

                autoTable(doc, {
                    head: [["INTEGRANTE", "QUINCENAS EN MORA / DETALLE", "DEUDA TOTAL"]],
                    body: deudoresRows,
                    startY: nextY + 10,
                    theme: 'striped',
                    headStyles: { fillColor: [50, 50, 50], textColor: colorWhite, fontSize: 9 },
                    styles: { fontSize: 8 },
                    columnStyles: { 2: { fontStyle: 'bold', halign: 'right' } }
                });
            }
        }

        // --- PAGINACIÓN Y MARCA DE AGUA (Iterar sobre todas las páginas) ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);

            // 1. MARCA DE AGUA CENTRADA
            try {
                if (img.src) {
                    doc.setGState(new doc.GState({ opacity: 0.12 })); // Transparencia sutil
                    const imgWidth = 140;
                    const imgHeight = 80;
                    // Centrado matemático en A4 (210 x 297)
                    const x = (210 - imgWidth) / 2;
                    const y = (297 - imgHeight) / 2;

                    doc.addImage(img, 'PNG', x, y, imgWidth, imgHeight, 'WATERMARK', 'FAST');
                    doc.setGState(new doc.GState({ opacity: 1 }));
                }
            } catch (e) {
                // Ignorar si falla la carga
            }

            // 2. PIE DE PÁGINA
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: 'right' });
            doc.text('VDRSOFTWARE - Soluciones Integrales', 15, 285);
        }

        doc.save(`VDR_Reporte_${selectedQuincena || 'General'}_${new Date().getTime()}.pdf`);
    };

    const filteredPagos = pagos.filter(p => {
        const matchesPersona = selectedPersona ? p.persona_id === parseInt(selectedPersona) : true;
        const matchesQuincena = selectedQuincena ? p.quincena === selectedQuincena : true;
        let matchesDate = true;
        const pagoDate = new Date(p.fecha).toISOString().split('T')[0];
        if (startDate && pagoDate < startDate) matchesDate = false;
        if (endDate && pagoDate > endDate) matchesDate = false;
        return matchesPersona && matchesQuincena && matchesDate;
    });

    return (
        <div className="animate-fade-in" style={{
            position: 'relative',
            minHeight: '100vh',
        }}>
            {/* Capa de superposición para atenuar la imagen de fondo y que el texto sea legible */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'transparent',
                zIndex: -1,
                pointerEvents: 'none'
            }}></div>

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Pagos y Reportes</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Gestione recaudos y genere reportes detallados.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-ghost" onClick={generatePDF} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        <Download size={20} /> Exportar Reporte PDF
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={20} /> Registrar Pago
                    </button>
                </div>
            </header>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Integrante</label>
                        <div style={{ position: 'relative' }}>
                            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                            <select style={{ paddingLeft: '2.5rem' }} value={selectedPersona} onChange={e => setSelectedPersona(e.target.value)}>
                                <option value="">Todos</option>
                                {personas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                        </div>
                    </div>
                    {/* ... (Rest of the filters remain the same, simplified for brevity here but full code included in file write) ... */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Quincena</label>
                        <select value={selectedQuincena} onChange={e => setSelectedQuincena(e.target.value)}>
                            <option value="">Todas</option>
                            <option value="Q1 Enero">Q1 Enero</option>
                            <option value="Q2 Enero">Q2 Enero</option>
                            <option value="Q1 Febrero">Q1 Febrero</option>
                            <option value="Q2 Febrero">Q2 Febrero</option>
                            <option value="Q1 Marzo">Q1 Marzo</option>
                            <option value="Q2 Marzo">Q2 Marzo</option>
                            <option value="Q1 Abril">Q1 Abril</option>
                            <option value="Q2 Abril">Q2 Abril</option>
                            <option value="Q1 Mayo">Q1 Mayo</option>
                            <option value="Q2 Mayo">Q2 Mayo</option>
                            <option value="Q1 Junio">Q1 Junio</option>
                            <option value="Q2 Junio">Q2 Junio</option>
                            <option value="Q1 Julio">Q1 Julio</option>
                            <option value="Q2 Julio">Q2 Julio</option>
                            <option value="Q1 Agosto">Q1 Agosto</option>
                            <option value="Q2 Agosto">Q2 Agosto</option>
                            <option value="Q1 Septiembre">Q1 Septiembre</option>
                            <option value="Q2 Septiembre">Q2 Septiembre</option>
                            <option value="Q1 Octubre">Q1 Octubre</option>
                            <option value="Q2 Octubre">Q2 Octubre</option>
                            <option value="Q1 Noviembre">Q1 Noviembre</option>
                            <option value="Q2 Noviembre">Q2 Noviembre</option>
                            <option value="Q1 Diciembre">Q1 Diciembre</option>
                            <option value="Q2 Diciembre">Q2 Diciembre</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Desde</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Hasta</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                            type="checkbox" 
                            id="morososFilter"
                            checked={showOnlyMorosos} 
                            onChange={e => setShowOnlyMorosos(e.target.checked)} 
                            style={{ width: 'auto', cursor: 'pointer' }}
                        />
                        <label htmlFor="morososFilter" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', marginBottom: 0 }}>
                            Solo Morosos
                        </label>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" onClick={clearFilters} style={{ padding: '0.5rem', width: '100%', fontSize: '0.8rem' }}>
                            Limpiar
                        </button>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0.5rem' }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Registros Encontrados</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{filteredPagos.length}</p>
                    </div>
                    <div style={{ height: '30px', width: '1px', background: 'var(--border-color)', alignSelf: 'center' }}></div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Total Recaudado (Filtro)</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>
                            ${filteredPagos.reduce((sum, p) => sum + p.monto, 0).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            <div className="card">
                {showOnlyMorosos ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Integrante</th>
                                <th>Quincenas en Mora</th>
                                <th>Total Deuda</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {personas.filter(p => p.es_moroso).map(p => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                                    <td style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
                                        {p.quincenas_en_mora?.join(', ') || 'Pendiente'}
                                    </td>
                                    <td style={{ color: 'var(--danger)', fontWeight: 700 }}>
                                        ${p.total_deuda?.toLocaleString()}
                                    </td>
                                    <td>
                                        <span style={{ 
                                            padding: '0.2rem 0.5rem', 
                                            borderRadius: '4px', 
                                            fontSize: '0.7rem', 
                                            background: '#fee2e2', 
                                            color: '#b91c1c',
                                            fontWeight: 700
                                        }}>MOROSO</span>
                                    </td>
                                </tr>
                            ))}
                            {personas.filter(p => p.es_moroso).length === 0 && (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay integrantes en mora según los cortes de fecha.</td></tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Integrante</th>
                                <th>Monto</th>
                                <th>Fecha</th>
                                <th>Quincena</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPagos.map(p => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600 }}>{p.persona_nombre}</td>
                                    <td style={{ color: 'var(--success)', fontWeight: 700 }}>${p.monto.toLocaleString()}</td>
                                    <td>{new Date(p.fecha).toLocaleDateString()}</td>
                                    <td>{p.quincena || 'N/A'}</td>
                                    <td>
                                        <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(p.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        {/* Modal content same as before */}
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem', display: 'block' }}>Registrar Pago</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Ingresa los detalles del abono para el integrante.</p>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Integrante</label>
                                <select required value={formData.persona_id} onChange={e => {
                                    const p = personas.find(x => x.id === parseInt(e.target.value));
                                    setFormData({ ...formData, persona_id: e.target.value, monto: p ? p.cuota : '' });
                                }}>
                                    <option value="">Seleccionar...</option>
                                    {personas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                            </div>
                            <div className="form-group"><label>Monto ($)</label><input type="number" required value={formData.monto} onChange={e => setFormData({ ...formData, monto: e.target.value })} /></div>
                            <div className="form-group"><label>Fecha de Pago</label><input type="date" required value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} /></div>
                            <div className="form-group">
                                <label>Quincena (Referencia)</label>
                                <select required value={formData.quincena} onChange={e => setFormData({ ...formData, quincena: e.target.value })}>
                                    <option value="">Seleccionar quincena...</option>
                                    <option value="Q1 Enero">Q1 Enero</option>
                                    <option value="Q2 Enero">Q2 Enero</option>
                                    <option value="Q1 Febrero">Q1 Febrero</option>
                                    <option value="Q2 Febrero">Q2 Febrero</option>
                                    <option value="Q1 Marzo">Q1 Marzo</option>
                                    <option value="Q2 Marzo">Q2 Marzo</option>
                                    <option value="Q1 Abril">Q1 Abril</option>
                                    <option value="Q2 Abril">Q2 Abril</option>
                                    <option value="Q1 Mayo">Q1 Mayo</option>
                                    <option value="Q2 Mayo">Q2 Mayo</option>
                                    <option value="Q1 Junio">Q1 Junio</option>
                                    <option value="Q2 Junio">Q2 Junio</option>
                                    <option value="Q1 Julio">Q1 Julio</option>
                                    <option value="Q2 Julio">Q2 Julio</option>
                                    <option value="Q1 Agosto">Q1 Agosto</option>
                                    <option value="Q2 Agosto">Q2 Agosto</option>
                                    <option value="Q1 Septiembre">Q1 Septiembre</option>
                                    <option value="Q2 Septiembre">Q2 Septiembre</option>
                                    <option value="Q1 Octubre">Q1 Octubre</option>
                                    <option value="Q2 Octubre">Q2 Octubre</option>
                                    <option value="Q1 Noviembre">Q1 Noviembre</option>
                                    <option value="Q2 Noviembre">Q2 Noviembre</option>
                                    <option value="Q1 Diciembre">Q1 Diciembre</option>
                                    <option value="Q2 Diciembre">Q2 Diciembre</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button type="button" className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}>Registrar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Pagos;
