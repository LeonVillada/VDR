import React, { useEffect, useState } from 'react';
import { CreditCard, Search, Plus, Trash2, Download, FileText, X, AlertCircle, Save, UserPlus, CheckSquare, Square } from 'lucide-react';
import { pagosApi, personasApi } from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Pagos = () => {
    const [pagos, setPagos] = useState([]);
    const [personas, setPersonas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showLoteModal, setShowLoteModal] = useState(false);
    
    // Filtros
    const [selectedPersona, setSelectedPersona] = useState('');
    const [selectedQuincena, setSelectedQuincena] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showOnlyMorosos, setShowOnlyMorosos] = useState(false);

    // Formulario Pago Individual
    const [formData, setFormData] = useState({ persona_id: '', monto: '', fecha: new Date().toISOString().split('T')[0], quincena: '' });

    // Lógica de Lote (Carga Masiva)
    const [lotePagos, setLotePagos] = useState([]);
    const [loteQuincena, setLoteQuincena] = useState('');
    const [isProcessingLote, setIsProcessingLote] = useState(false);

    const quincenas = [
        "Q1 Enero", "Q2 Enero", "Q1 Febrero", "Q2 Febrero", "Q1 Marzo", "Q2 Marzo",
        "Q1 Abril", "Q2 Abril", "Q1 Mayo", "Q2 Mayo", "Q1 Junio", "Q2 Junio",
        "Q1 Julio", "Q2 Julio", "Q1 Agosto", "Q2 Agosto", "Q1 Septiembre", "Q2 Septiembre",
        "Q1 Octubre", "Q2 Octubre", "Q1 Noviembre", "Q2 Noviembre", "Q1 Diciembre", "Q2 Diciembre"
    ];

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
            setPersonas(personasRes.data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    // Al cambiar la quincena del lote, cargar automáticamente a los que faltan
    const handleLoteQuincenaChange = (q) => {
        setLoteQuincena(q);
        if (!q) {
            setLotePagos([]);
            return;
        }

        // Integrantes que NO tienen pago para esa quincena
        const yaPagaron = pagos.filter(p => p.quincena === q).map(p => p.persona_id);
        const faltantes = personas
            .filter(p => !yaPagaron.includes(p.id) && p.estado === 'activo')
            .map(p => ({
                persona_id: p.id,
                nombre: p.nombre,
                monto: p.cuota,
                fecha: new Date().toISOString().split('T')[0],
                quincena: q
            }));
        
        setLotePagos(faltantes);
    };

    const updateLoteEntry = (index, field, value) => {
        const newLote = [...lotePagos];
        newLote[index][field] = value;
        setLotePagos(newLote);
    };

    const removeLoteEntry = (index) => {
        setLotePagos(lotePagos.filter((_, i) => i !== index));
    };

    const handleLoteSubmit = async (e) => {
        e.preventDefault();
        if (lotePagos.length === 0) return;
        setIsProcessingLote(true);
        try {
            await pagosApi.createLote({ pagos: lotePagos });
            setShowLoteModal(false);
            setLotePagos([]);
            setLoteQuincena('');
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Error al procesar el lote.");
        } finally {
            setIsProcessingLote(false);
        }
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

    const filteredPagos = pagos.filter(p => {
        const matchesPersona = selectedPersona ? p.persona_id === parseInt(selectedPersona) : true;
        const matchesQuincena = selectedQuincena ? p.quincena === selectedQuincena : true;
        let matchesDate = true;
        const pagoDate = new Date(p.fecha).toISOString().split('T')[0];
        if (startDate && pagoDate < startDate) matchesDate = false;
        if (endDate && pagoDate > endDate) matchesDate = false;
        return matchesPersona && matchesQuincena && matchesDate;
    });

    const generatePDF = async () => {
        const doc = new jsPDF();
        const W = doc.internal.pageSize.getWidth();
        const H = doc.internal.pageSize.getHeight();
        const margin = 15;

        // Colores corporativos
        const cGreen = [16, 185, 129];
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

        const drawAesthetics = (docInstance) => {
            if (logoBase64) {
                docInstance.saveGraphicsState();
                docInstance.setGState(new docInstance.GState({ opacity: 0.05 }));
                docInstance.addImage(logoBase64, 'PNG', W/2 - 60, H/2 - 30, 120, 35, undefined, 'FAST');
                docInstance.restoreGraphicsState();
            }
            docInstance.setFillColor(...cDark);
            docInstance.rect(0, 0, W, 40, 'F');
            if (logoBase64) docInstance.addImage(logoBase64, 'PNG', margin, 10, 50, 15);
            docInstance.setFontSize(20);
            docInstance.setFont('helvetica', 'bold');
            docInstance.setTextColor(...cGreen);
            docInstance.text('REPORTE DE RECAUDOS', W - margin, 20, { align: 'right' });
            docInstance.setFontSize(8);
            docInstance.setTextColor(180, 180, 180);
            docInstance.text(`EMITIDO: ${new Date().toLocaleString()}`, W - margin, 28, { align: 'right' });
            docInstance.setDrawColor(...cGreen);
            docInstance.line(margin, 40, W - margin, 40);
        };

        drawAesthetics(doc);
        
        autoTable(doc, {
            head: [["INTEGRANTE", "MONTO", "FECHA", "QUINCENA"]],
            body: filteredPagos.map(p => [
                p.persona_nombre.toUpperCase(), 
                `$${p.monto.toLocaleString()}`, 
                new Date(p.fecha).toLocaleDateString(), 
                p.quincena || 'N/A'
            ]),
            startY: 50,
            theme: 'striped',
            headStyles: { fillColor: cGreen, textColor: cWhite, fontStyle: 'bold' },
            styles: { fontSize: 9 },
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' }, 2: { halign: 'center' } },
            didDrawPage: (data) => {
                if (data.pageNumber > 1) drawAesthetics(doc);
            }
        });

        // Totales al final
        const recolectado = filteredPagos.reduce((s, p) => s + Number(p.monto), 0);
        let fY = doc.lastAutoTable.finalY + 10;
        
        if (fY > H - 30) {
            doc.addPage();
            drawAesthetics(doc);
            fY = 50;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...cDark);
        doc.text('TOTAL RECAUDADO LOTE IMPRESO', margin, fY);
        doc.setTextColor(...cGreen);
        doc.text(`$${recolectado.toLocaleString()}`, W - margin, fY, { align: 'right' });
        
        doc.setDrawColor(...cGreen);
        doc.setLineWidth(0.5);
        doc.line(margin, fY + 2, W - margin, fY + 2);

        const pages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text(`VDRSOFTWARE - Página ${i} de ${pages}`, W / 2, H - 10, { align: 'center' });
        }

        doc.save(`VDR_Pagos_${new Date().getTime()}.pdf`);
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}>Cargando sistema de pagos...</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: '0.25rem' }}>
                        Pagos y Reportes
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Gestione recaudos y genere reportes detallados.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-ghost" onClick={generatePDF} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        <Download size={20} /> Exportar PDF
                    </button>
                    <button className="btn btn-ghost" onClick={() => setShowLoteModal(true)} style={{ border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: 600 }}>
                        <CreditCard size={20} /> Carga Masiva
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={20} /> Registrar Pago
                    </button>
                </div>
            </header>

            {/* Filtros */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="label">Integrante</label>
                        <select value={selectedPersona} onChange={e => setSelectedPersona(e.target.value)}>
                            <option value="">Todos los integrantes</option>
                            {personas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="label">Quincena</label>
                        <select value={selectedQuincena} onChange={e => setSelectedQuincena(e.target.value)}>
                            <option value="">Todas las quincenas</option>
                            {quincenas.map(q => <option key={q} value={q}>{q}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="label">Desde</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="label">Hasta</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
                    </div>
                 </div>
            </div>

            <div className="card">
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
            </div>

            {/* Modal de Pago Individual */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>Registrar Pago</h2>
                            <p style={{ color: 'var(--text-muted)' }}>Ingresa los detalles del abono individual.</p>
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
                            <div className="form-group"><label>Monto ($)</label><input type="number" required value={formData.monto} onChange={e => setFormData({ ...formData, monto: e.target.value })} className="input" /></div>
                            <div className="form-group"><label>Fecha</label><input type="date" required value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} className="input" /></div>
                            <div className="form-group">
                                <label>Quincena</label>
                                <select required value={formData.quincena} onChange={e => setFormData({ ...formData, quincena: e.target.value })}>
                                    <option value="">Seleccionar...</option>
                                    {quincenas.map(q => <option key={q} value={q}>{q}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Registrar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Carga Masiva (Lote) */}
            {showLoteModal && (
                <div className="modal-overlay" onClick={() => setShowLoteModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '850px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>Carga Masiva de Pagos</h2>
                                <p style={{ color: 'var(--text-muted)' }}>Configure el lote de abonos para la quincena.</p>
                            </div>
                            <button className="btn btn-ghost" onClick={() => setShowLoteModal(false)}><X /></button>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
                            <div className="form-group" style={{ maxWidth: '300px', margin: '0' }}>
                                <label style={{ fontWeight: 700 }}>Quincena del Lote</label>
                                <select value={loteQuincena} onChange={e => handleLoteQuincenaChange(e.target.value)} style={{ border: '2px solid var(--primary)' }}>
                                    <option value="">Seleccione para cargar faltantes...</option>
                                    {quincenas.map(q => <option key={q} value={q}>{q}</option>)}
                                </select>
                            </div>
                        </div>

                        {lotePagos.length > 0 ? (
                            <form onSubmit={handleLoteSubmit}>
                                <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '2rem', paddingRight: '0.5rem' }}>
                                    <table style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ background: 'transparent', border: 'none' }}>Integrante</th>
                                                <th style={{ background: 'transparent', border: 'none' }}>Monto ($)</th>
                                                <th style={{ background: 'transparent', border: 'none' }}>Fecha de Pago</th>
                                                <th style={{ background: 'transparent', border: 'none' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lotePagos.map((p, index) => (
                                                <tr key={index} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                                                    <td style={{ padding: '1rem', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px', fontWeight: 600 }}>{p.nombre}</td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <input 
                                                            type="number" 
                                                            value={p.monto} 
                                                            onChange={e => updateLoteEntry(index, 'monto', e.target.value)} 
                                                            className="input" 
                                                            style={{ padding: '0.5rem', height: '40px' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <input 
                                                            type="date" 
                                                            value={p.fecha} 
                                                            onChange={e => updateLoteEntry(index, 'fecha', e.target.value)} 
                                                            className="input" 
                                                            style={{ padding: '0.5rem', height: '40px' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '1rem', borderTopRightRadius: '12px', borderBottomRightRadius: '12px', textAlign: 'center' }}>
                                                        <button type="button" onClick={() => removeLoteEntry(index)} style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                                    <div style={{ fontSize: '1.1rem' }}>
                                        Total a recaudar: <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
                                            ${lotePagos.reduce((a, b) => a + Number(b.monto), 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary" 
                                        style={{ height: '3.5rem', padding: '0 3rem' }}
                                        disabled={isProcessingLote}
                                    >
                                        {isProcessingLote ? 'Procesando...' : `Registrar ${lotePagos.length} Pagos`}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                                <UserPlus size={48} style={{ marginBottom: '1rem' }} />
                                <p>Seleccione una quincena para cargar los integrantes pendientes.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Pagos;
