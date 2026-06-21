import React, { useEffect, useState } from 'react';
import { alcantarillasApi, personasApi } from '../api';
import { Plus, X, ChevronDown, ChevronUp, Trash2, TrendingUp, DollarSign, Trophy, Users, AlertCircle, CheckCircle2, Zap, FileDown, Info } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Tarjeta de Estadística ─────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, sub }) => (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
        <div style={{ padding: '0.9rem', borderRadius: '14px', background: `rgba(${color},0.12)`, color: `rgb(${color})`, flexShrink: 0 }}>
            <Icon size={26} />
        </div>
        <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{value}</div>
            {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>}
        </div>
    </div>
);

// ── Barra de progreso ──────────────────────────────────────────
const BarraProgreso = ({ vendidas, tope }) => {
    const pct   = Math.min((vendidas / tope) * 100, 100);
    const color = pct >= 100 ? '16,185,129' : pct >= 60 ? '245,158,11' : '239,68,68';
    return (
        <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                <span style={{ color: `rgb(${color})`, fontWeight: 700 }}>{vendidas}/{tope} boletas</span>
                <span style={{ color: 'var(--text-muted)' }}>{pct.toFixed(0)}%</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: `rgb(${color})`, transition: 'width 0.4s ease', borderRadius: '4px' }} />
            </div>
        </div>
    );
};

// ── Badge de estado de pago (usa meta dinámica) ────────────────
const BadgePago = ({ montoPagado, metaPorIntegrante }) => {
    const listo = montoPagado >= metaPorIntegrante;
    return (
        <span style={{
            padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
            background: listo ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
            color: listo ? 'var(--success)' : 'var(--danger)'
        }}>
            {listo ? '✅ Completo' : '⚠ Pendiente'}
        </span>
    );
};

// ── Valores por defecto del formulario ─────────────────────────
const FORM_DEFAULTS = {
    nombre:             '',
    fecha:              '',
    precio_boleta:      3000,   // configurable por evento
    tope_por_persona:   15,     // configurable por evento
    costo_premio:       0,
    comprobante:        null
};

export default function Alcantarilla() {
    const [alcantarillas, setAlcantarillas] = useState([]);
    const [personas, setPersonas]           = useState([]);
    const [stats, setStats]                 = useState({ total_alcantarillas: 0, total_recaudado: 0, total_premios: 0, ganancia_neta: 0, ganancia_proyectada: 0 });
    const [expandido, setExpandido]         = useState(null);
    const [ventasPorAlc, setVentasPorAlc]   = useState({});
    const [loading, setLoading]             = useState(true);
    const [showModal, setShowModal]         = useState(false);
    const [showVentaModal, setShowVentaModal] = useState(null);
    const [formAlc, setFormAlc]             = useState(FORM_DEFAULTS);
    const [formVenta, setFormVenta]         = useState({ persona_id: '', monto_pagado: '' });
    const [error, setError]                 = useState('');

    // ── Meta calculada del formulario en tiempo real ───────────
    const metaFormulario = Number(formAlc.precio_boleta || 0) * Number(formAlc.tope_por_persona || 0);

    const cargar = async () => {
        try {
            const [alcRes, perRes, statsRes] = await Promise.all([
                alcantarillasApi.getAll(),
                personasApi.getAll(),
                alcantarillasApi.getStats()
            ]);
            setAlcantarillas(alcRes.data);
            setPersonas(perRes.data);
            setStats(statsRes.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { cargar(); }, []);

    const cargarVentas = async (id) => {
        const res = await alcantarillasApi.getVentas(id);
        setVentasPorAlc(prev => ({ ...prev, [id]: res.data }));
    };

    const toggleExpandir = async (id) => {
        if (expandido === id) { setExpandido(null); return; }
        setExpandido(id);
        await cargarVentas(id);
    };

    const handleCrearAlcantarilla = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const formData = new FormData();
            formData.append('nombre',           formAlc.nombre);
            formData.append('fecha',            formAlc.fecha);
            formData.append('precio_boleta',    Number(formAlc.precio_boleta)    || 3000);
            formData.append('tope_por_persona', Number(formAlc.tope_por_persona) || 15);
            formData.append('costo_premio',     Number(formAlc.costo_premio)     || 0);
            if (formAlc.comprobante) {
                formData.append('comprobante', formAlc.comprobante);
            }

            await alcantarillasApi.create(formData);
            setShowModal(false);
            setFormAlc(FORM_DEFAULTS);
            cargar();
        } catch (e) { setError(e.response?.data?.error || 'Error al crear'); }
    };

    const handleRegistrarVenta = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const alc = alcantarillas.find(a => a.id === showVentaModal);
            // Enviar monto_pagado directamente; el controlador lo usará
            await alcantarillasApi.registrarVenta({
                alcantarilla_id:   showVentaModal,
                persona_id:        formVenta.persona_id,
                monto_pagado:      Number(formVenta.monto_pagado),
                // unidades calculadas según el precio por boleta
                unidades_vendidas: alc ? Math.round(Number(formVenta.monto_pagado) / Number(alc.precio_boleta)) : 0
            });
            const alcId = showVentaModal;
            setShowVentaModal(null);
            setFormVenta({ persona_id: '', monto_pagado: '' });
            await cargarVentas(alcId);
            cargar();
        } catch (e) { setError(e.response?.data?.error || 'Error al registrar'); }
    };

    const handleEliminarAlcantarilla = async (id) => {
        if (!confirm('¿Eliminar esta alcantarilla y todas sus ventas?')) return;
        await alcantarillasApi.delete(id);
        cargar();
    };

    const handleEliminarVenta = async (ventaId, alcId) => {
        await alcantarillasApi.eliminarVenta(ventaId);
        await cargarVentas(alcId);
        cargar();
    };

    const generatePDF = async (alc, ventas) => {
        const metaPorIntegrante = Number(alc.precio_boleta) * Number(alc.tope_por_persona);
        const doc = new jsPDF();
        const W = doc.internal.pageSize.getWidth();
        const H = doc.internal.pageSize.getHeight();
        const margin = 15;

        const cGreen  = [16, 185, 129];
        const cGrey   = [120, 120, 120];
        const cYellow = [245, 200, 50];
        const cDark   = [15, 23, 42];

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
            docInstance.text('LA ALCANTARILLA', W - margin, 18, { align: 'right' });
            docInstance.setFontSize(8);
            docInstance.setTextColor(180, 180, 180);
            docInstance.text(alc.nombre.toUpperCase(), W - margin, 26, { align: 'right' });
            docInstance.text(new Date(alc.fecha).toLocaleDateString(), W - margin, 32, { align: 'right' });
            docInstance.setDrawColor(...cGreen);
            docInstance.line(margin, 40, W - margin, 40);
        };

        drawAesthetics(doc);

        const parseDate = (d) => {
            if (!d) return new Date();
            const str = typeof d === 'string' ? d.split('T')[0] : new Date(d).toISOString().split('T')[0];
            return new Date(`${str}T00:00:00`);
        };
        const personasElegibles = personas.filter(p => parseDate(p.fecha_ingreso) <= parseDate(alc.fecha));
        const totalRecaudado = ventas.reduce((s, v) => s + Number(v.monto_pagado), 0);
        const meta           = personasElegibles.length * metaPorIntegrante;

        const boxW = 85;
        const box = (label, value, x, borderColor) => {
            doc.setDrawColor(...borderColor);
            doc.setLineWidth(0.5);
            doc.roundedRect(x, 48, boxW, 18, 2, 2, 'S');
            doc.setFontSize(7);
            doc.setTextColor(...cGrey);
            doc.text(label, x + 4, 54);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...cDark);
            doc.text(value, x + 4, 62);
        };
        box('META TOTAL EVENTO', '$' + meta.toLocaleString(), 15, cGreen);
        box('RECAUDADO ACTUAL',  '$' + totalRecaudado.toLocaleString(), 110, cYellow);

        let y = 78;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...cDark);
        doc.text('ESTADO POR INTEGRANTE', 14, y);
        doc.setDrawColor(...cGreen);
        doc.setLineWidth(0.5);
        doc.line(14, y + 2, 85, y + 2);

        const personasAZ = [...personasElegibles].sort((a, b) => a.nombre.localeCompare(b.nombre));
        const rows = personasAZ.map(p => {
            const venta  = ventas.find(v => v.persona_id === p.id || v.persona_nombre === p.nombre);
            const pagado = venta ? Number(venta.monto_pagado) : 0;
            return [
                p.nombre.toUpperCase(),
                '$' + pagado.toLocaleString(),
                pagado >= metaPorIntegrante ? 'PAGADO' : 'PENDIENTE'
            ];
        });

        autoTable(doc, {
            head: [['INTEGRANTE', 'MONTO PAGADO', 'ESTADO']],
            body: rows,
            startY: y + 6,
            theme: 'plain',
            headStyles: { fillColor: false, textColor: cGreen, fontSize: 8, fontStyle: 'bold', halign: 'center', lineColor: cGreen, lineWidth: 0.4 },
            styles: { fontSize: 8, textColor: [40, 40, 40], fillColor: false, cellPadding: 3, lineColor: [220, 220, 220], lineWidth: 0.1 },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'right' }, 2: { halign: 'center', fontStyle: 'bold' } },
            didParseCell(data) {
                if (data.column.index === 2 && data.section === 'body') {
                    data.cell.styles.textColor = data.cell.raw === 'PAGADO' ? cGreen : [245, 158, 11];
                }
                data.cell.styles.fillColor = data.row.index % 2 === 0 ? [252, 252, 252] : false;
            },
            didDrawPage: (data) => { if (data.pageNumber > 1) drawAesthetics(doc); }
        });

        const pages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(...cGrey);
            doc.text('Pagina ' + i + ' de ' + pages + ' - VDRSOFTWARE', W / 2, H - 6, { align: 'center' });
        }

        doc.save('Alcantarilla_' + alc.nombre.replace(/\s+/g, '_') + '.pdf');
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--primary)' }}>
            <div className="animate-pulse">Cargando Alcantarillas...</div>
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>

            {/* ── HEADER ── */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>La Alcantarilla 🎰</h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Precios y boletas <b style={{ color: 'var(--primary)' }}>configurables por evento</b> · Premio variable
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => { setShowModal(true); setError(''); }}>
                    <Plus size={18} /> Nueva Alcantarilla
                </button>
            </header>

            {/* ── STATS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
                <StatCard label="Alcantarillas" value={stats.total_alcantarillas} icon={Trophy} color="245,158,11" />
                <StatCard
                    label="Total Recaudado"
                    value={`$${Number(stats.total_recaudado).toLocaleString()}`}
                    icon={DollarSign} color="16,185,129"
                    sub={`Meta total: $${Number(stats.ganancia_proyectada + Number(stats.total_premios)).toLocaleString()}`}
                />
                <StatCard
                    label="Ganancia si todos pagan"
                    value={`$${Number(stats.ganancia_proyectada).toLocaleString()}`}
                    icon={TrendingUp}
                    color="34,211,238"
                    sub="Proyección neta − premios"
                />
                <StatCard
                    label="Progreso de Recaudo"
                    value={stats.total_recaudado > 0 && (stats.ganancia_proyectada + Number(stats.total_premios)) > 0
                        ? `${Math.min(100, (stats.total_recaudado / (stats.ganancia_proyectada + Number(stats.total_premios))) * 100).toFixed(1)}%`
                        : '0%'}
                    icon={Zap}
                    color="16,185,129"
                    sub={stats.total_recaudado > 0 ? "🟢 Registros en curso" : "⏳ Sin ventas aún"}
                />
            </div>

            {/* ── LISTA ── */}
            {alcantarillas.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <Trophy size={48} style={{ opacity: 0.15, margin: '0 auto 1rem' }} />
                    <p>No hay alcantarillas. Crea la primera para comenzar.</p>
                </div>
            ) : alcantarillas.map(alc => {
                const ventas             = ventasPorAlc[alc.id] || [];
                const metaPorIntegrante  = Number(alc.precio_boleta) * Number(alc.tope_por_persona);
                const totalVendido       = Number(alc.total_recaudado);
                const ganancia           = totalVendido - Number(alc.costo_premio);
                const totalBoletas       = Number(alc.total_personas_activas || 0) * Number(alc.tope_por_persona);
                const boletasVendidas    = ventas.reduce((s, v) => s + v.unidades_vendidas, 0);
                const pctGlobal          = totalBoletas > 0 ? Math.min((boletasVendidas / totalBoletas) * 100, 100) : 0;
                const listosParaJugar    = ventas.filter(v => Number(v.monto_pagado) >= metaPorIntegrante).length;

                return (
                    <div key={alc.id} className="card" style={{ marginBottom: '1rem', padding: 0, overflow: 'hidden' }}>

                        {/* Cabecera */}
                        <div
                            onClick={() => toggleExpandir(alc.id)}
                            style={{ padding: '1.2rem 1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                {alc.comprobante_premio && (
                                    <img
                                        src={`http://${window.location.hostname}:2014/uploads/${alc.comprobante_premio}`}
                                        style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--glass-border)' }}
                                        alt="Factura"
                                    />
                                )}
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>🎰 {alc.nombre}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {new Date(alc.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        {' · '}{listosParaJugar}/{alc.total_personas_activas || 0} integrantes completos
                                    </div>
                                    {/* Chip de configuración de precio */}
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '5px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.72rem', background: 'rgba(16,185,129,0.12)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                                            🎟 {Number(alc.tope_por_persona)} boletas
                                        </span>
                                        <span style={{ fontSize: '0.72rem', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                                            💵 ${Number(alc.precio_boleta).toLocaleString()} c/u
                                        </span>
                                        <span style={{ fontSize: '0.72rem', background: 'rgba(34,211,238,0.12)', color: '#22d3ee', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                                            💰 Meta: ${metaPorIntegrante.toLocaleString()}/persona
                                        </span>
                                    </div>
                                    {/* Barra de progreso global */}
                                    <div style={{ marginTop: '6px', width: '260px' }}>
                                        <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${pctGlobal}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.4s' }} />
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                                            {boletasVendidas}/{totalBoletas} boletas · {pctGlobal.toFixed(0)}% del total
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Recaudado</div>
                                    <div style={{ fontWeight: 800, color: 'var(--primary)' }}>${totalVendido.toLocaleString()}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Premio</div>
                                    <div style={{ fontWeight: 800, color: 'var(--danger)' }}>${Number(alc.costo_premio).toLocaleString()}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ganancia</div>
                                    <div style={{ fontWeight: 800, color: ganancia >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                        ${ganancia.toLocaleString()}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                        onClick={e => { e.stopPropagation(); setShowVentaModal(alc.id); setError(''); }}>
                                        <Plus size={14} /> Venta
                                    </button>
                                    <button
                                        className="btn btn-ghost"
                                        style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', color: 'var(--accent)' }}
                                        title="Exportar PDF"
                                        onClick={async e => {
                                            e.stopPropagation();
                                            let v = ventasPorAlc[alc.id];
                                            if (!v) { await cargarVentas(alc.id); v = ventasPorAlc[alc.id] || []; }
                                            generatePDF(alc, v);
                                        }}>
                                        <FileDown size={16} />
                                    </button>
                                    <button className="btn btn-ghost" style={{ padding: '0.4rem 0.6rem', color: 'var(--danger)' }}
                                        onClick={e => { e.stopPropagation(); handleEliminarAlcantarilla(alc.id); }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                {expandido === alc.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </div>

                        {/* Detalle expandido */}
                        {expandido === alc.id && (
                            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '1rem' }}>
                                    <Users size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                    Ventas por integrante ({ventas.length} / {alc.total_personas_activas || 0})
                                </div>

                                {ventas.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin registros de venta aún.</p>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '0.75rem' }}>
                                        {ventas.map(v => (
                                            <div key={v.id} style={{
                                                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                                                borderRadius: '12px', padding: '0.9rem 1rem'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                    <div>
                                                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{v.persona_nombre}</span>
                                                        <div style={{ marginTop: '2px' }}>
                                                            <BadgePago montoPagado={Number(v.monto_pagado)} metaPorIntegrante={metaPorIntegrante} />
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>${Number(v.monto_pagado).toLocaleString()}</div>
                                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '2px', marginTop: '4px' }}
                                                            onClick={() => handleEliminarVenta(v.id, alc.id)}>
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <BarraProgreso vendidas={v.unidades_vendidas} tope={Number(alc.tope_por_persona)} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* ── MODAL: NUEVA ALCANTARILLA ── */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontWeight: 800, fontSize: '1.3rem' }}>🎰 Nueva Alcantarilla</h2>
                            <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem', color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem' }}>
                                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />{error}
                            </div>
                        )}

                        <form onSubmit={handleCrearAlcantarilla}>
                            {/* Nombre */}
                            <div className="form-group">
                                <label>Nombre del Evento *</label>
                                <input required placeholder="Ej: Alcantarilla Trimestre 1 – Abril" value={formAlc.nombre}
                                    onChange={e => setFormAlc(p => ({ ...p, nombre: e.target.value }))} />
                            </div>

                            {/* Fecha */}
                            <div className="form-group">
                                <label>Fecha *</label>
                                <input type="date" required value={formAlc.fecha}
                                    onChange={e => setFormAlc(p => ({ ...p, fecha: e.target.value }))} />
                            </div>

                            {/* Precio y boletas en grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label>💵 Precio por Boleta ($) *</label>
                                    <input
                                        type="number" required min="100" step="100"
                                        placeholder="Ej: 3000"
                                        value={formAlc.precio_boleta}
                                        onChange={e => setFormAlc(p => ({ ...p, precio_boleta: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label>🎟 Boletas por Integrante *</label>
                                    <input
                                        type="number" required min="1" max="100"
                                        placeholder="Ej: 15"
                                        value={formAlc.tope_por_persona}
                                        onChange={e => setFormAlc(p => ({ ...p, tope_por_persona: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Preview de meta calculada */}
                            {formAlc.precio_boleta > 0 && formAlc.tope_por_persona > 0 && (
                                <div style={{
                                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                                    borderRadius: '10px', padding: '0.85rem 1rem', margin: '0.75rem 0',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        <Info size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                        Meta por integrante:
                                    </span>
                                    <b style={{ color: 'var(--primary)', fontSize: '1.05rem' }}>
                                        ${metaFormulario.toLocaleString()}
                                    </b>
                                </div>
                            )}

                            {/* Costo del premio */}
                            <div className="form-group">
                                <label>🏆 Precio del Premio ($)</label>
                                <input type="number" min="0" placeholder="Ej: 100000" value={formAlc.costo_premio}
                                    onChange={e => setFormAlc(p => ({ ...p, costo_premio: e.target.value }))} />
                            </div>

                            {/* Comprobante */}
                            <div className="form-group">
                                <label>📷 Foto de la Factura del Premio</label>
                                <input type="file" accept="image/*"
                                    onChange={e => setFormAlc(p => ({ ...p, comprobante: e.target.files[0] }))} />
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Opcional: sube la foto del recibo del premio.</p>
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                                <CheckCircle2 size={16} /> Crear Alcantarilla
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: REGISTRAR VENTA ── */}
            {showVentaModal && (() => {
                const alc                    = alcantarillas.find(a => a.id === showVentaModal);
                const metaPorIntegrante      = alc ? Number(alc.precio_boleta) * Number(alc.tope_por_persona) : 0;
                const ventasActuales         = ventasPorAlc[showVentaModal] || [];
                const parseDate = (d) => {
                    if (!d) return new Date();
                    const str = typeof d === 'string' ? d.split('T')[0] : new Date(d).toISOString().split('T')[0];
                    return new Date(`${str}T00:00:00`);
                };
                const personasYaRegistradas  = new Set(ventasActuales.map(v => v.persona_id));
                const personasDisponibles    = personas.filter(p => {
                    if (personasYaRegistradas.has(p.id)) return false;
                    if (!alc) return false;
                    return parseDate(p.fecha_ingreso) <= parseDate(alc.fecha);
                });
                const montoPagado            = Number(formVenta.monto_pagado) || 0;
                const esCompleto             = montoPagado >= metaPorIntegrante;
                const falta                  = metaPorIntegrante - montoPagado;
                // boletas estimadas según precio
                const boletasEstimadas       = alc && Number(alc.precio_boleta) > 0
                    ? Math.round(montoPagado / Number(alc.precio_boleta))
                    : 0;

                return (
                    <div className="modal-overlay" onClick={() => setShowVentaModal(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div>
                                    <h2 style={{ fontWeight: 800, fontSize: '1.3rem' }}>Registrar Venta</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{alc?.nombre}</p>
                                </div>
                                <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={() => setShowVentaModal(null)}><X size={20} /></button>
                            </div>

                            {/* Info de precios de esta alcantarilla */}
                            <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '0.75rem', marginBottom: '1.25rem', fontSize: '0.82rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                <span>🎟 <b>{Number(alc?.tope_por_persona)} boletas</b> por integrante</span>
                                <span>💵 <b>${Number(alc?.precio_boleta).toLocaleString()}</b> por boleta</span>
                                <span>💰 Meta: <b style={{ color: 'var(--primary)' }}>${metaPorIntegrante.toLocaleString()}</b></span>
                            </div>

                            {error && (
                                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem', color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem' }}>
                                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />{error}
                                </div>
                            )}

                            <form onSubmit={handleRegistrarVenta}>
                                {/* Integrante */}
                                <div className="form-group">
                                    <label>Integrante *</label>
                                    <select required value={formVenta.persona_id}
                                        onChange={e => setFormVenta(p => ({ ...p, persona_id: e.target.value }))}>
                                        <option value="">— Seleccionar integrante —</option>
                                        {personasDisponibles.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Monto pagado (campo libre) */}
                                <div className="form-group">
                                    <label>💰 Monto Pagado ($) *</label>
                                    <input
                                        type="number" required min="0" step="500"
                                        placeholder={`Ingresa el monto — meta: $${metaPorIntegrante.toLocaleString()}`}
                                        value={formVenta.monto_pagado}
                                        onChange={e => setFormVenta(p => ({ ...p, monto_pagado: e.target.value }))}
                                    />
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        Puedes ingresar cualquier monto — no está restringido a la meta.
                                    </p>
                                </div>

                                {/* Preview dinámico */}
                                {formVenta.monto_pagado && (
                                    <div style={{
                                        background: esCompleto ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                                        border: `1px solid ${esCompleto ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                                        borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85rem' }}>
                                                {esCompleto
                                                    ? '✅ Cuota completa'
                                                    : `⚠ Faltan $${falta.toLocaleString()} para completar`}
                                            </span>
                                            <b style={{ color: esCompleto ? 'var(--success)' : 'var(--warning)', fontSize: '1rem' }}>
                                                ${montoPagado.toLocaleString()}
                                            </b>
                                        </div>
                                        {boletasEstimadas > 0 && (
                                            <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                ≈ {boletasEstimadas} boleta{boletasEstimadas !== 1 ? 's' : ''} a ${Number(alc?.precio_boleta).toLocaleString()} c/u
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                    <CheckCircle2 size={16} /> Registrar Venta
                                </button>
                            </form>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
