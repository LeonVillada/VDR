import React, { useEffect, useState } from 'react';
import { alcantarillasApi, personasApi } from '../api';
import { Plus, X, ChevronDown, ChevronUp, Trash2, TrendingUp, DollarSign, Trophy, Users, AlertCircle, CheckCircle2, Zap, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Constantes del negocio ─────────────────────────────────────
const BOLETAS_POR_PERSONA = 10;
const PRECIO_BOLETA       = 3000;
const META_POR_PERSONA    = BOLETAS_POR_PERSONA * PRECIO_BOLETA; // $30.000

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

// ── Badge de estado de pago ────────────────────────────────────
const BadgePago = ({ montoPagado }) => {
    const listo = montoPagado >= META_POR_PERSONA;
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

export default function Alcantarilla() {
    const [alcantarillas, setAlcantarillas] = useState([]);
    const [personas, setPersonas]           = useState([]);
    const [stats, setStats]                 = useState({ total_alcantarillas: 0, total_recaudado: 0, total_premios: 0, ganancia_neta: 0, ganancia_proyectada: 0 });
    const [expandido, setExpandido]         = useState(null);
    const [ventasPorAlc, setVentasPorAlc]   = useState({});
    const [loading, setLoading]             = useState(true);
    const [showModal, setShowModal]         = useState(false);
    const [showVentaModal, setShowVentaModal] = useState(null);
    const [formAlc, setFormAlc]             = useState({ nombre: '', fecha: '', precio_boleta: PRECIO_BOLETA, costo_premio: 0, tope_por_persona: BOLETAS_POR_PERSONA });
    const [formVenta, setFormVenta]         = useState({ persona_id: '', unidades_vendidas: '' });
    const [error, setError]                 = useState('');

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
            // Forzar valores fijos de negocio
            await alcantarillasApi.create({
                ...formAlc,
                precio_boleta:    PRECIO_BOLETA,
                tope_por_persona: BOLETAS_POR_PERSONA
            });
            setShowModal(false);
            setFormAlc({ nombre: '', fecha: '', precio_boleta: PRECIO_BOLETA, costo_premio: 0, tope_por_persona: BOLETAS_POR_PERSONA });
            cargar();
        } catch (e) { setError(e.response?.data?.error || 'Error al crear'); }
    };

    const handleRegistrarVenta = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await alcantarillasApi.registrarVenta({ ...formVenta, alcantarilla_id: showVentaModal });
            const alcId = showVentaModal;
            setShowVentaModal(null);
            setFormVenta({ persona_id: '', unidades_vendidas: '' });
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
        const doc = new jsPDF();
        const W = doc.internal.pageSize.getWidth();
        const H = doc.internal.pageSize.getHeight();

        // -- Imagen de fondo --
        try {
            const imgRes = await fetch('/assets/buffonVDR.png');
            const blob   = await imgRes.blob();
            const b64    = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
            doc.addImage(b64, 'PNG', 0, 0, W, H, undefined, 'FAST');
        } catch (e) { console.warn('Sin imagen:', e); }

        // -- Overlay claro (45%) para que la imagen sea visible --
        doc.setFillColor(0, 0, 0);
        doc.setGState(new doc.GState({ opacity: 0.45 }));
        doc.rect(0, 0, W, H, 'F');
        doc.setGState(new doc.GState({ opacity: 1 }));

        const cWhite  = [255, 255, 255];
        const cGreen  = [16, 185, 129];
        const cGrey   = [160, 160, 160];
        const cYellow = [245, 200, 50];

        // -- Header SIN FONDO (texto sobre la imagen) --
        doc.setFontSize(26);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...cGreen);
        doc.text('VERDADEROS', 15, 18);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...cGrey);
        doc.text('LA ALCANTARILLA - ' + alc.nombre.toUpperCase(), 15, 26);
        doc.text(
            new Date(alc.fecha).toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' }),
            15, 32
        );
        doc.text('VDRSOFTWARE', W - 15, 26, { align: 'right' });

        // Linea separadora verde bajo el header
        doc.setDrawColor(...cGreen);
        doc.setLineWidth(0.5);
        doc.line(14, 36, W - 14, 36);

        // -- Calculos --
        const totalRecaudado = ventas.reduce((s, v) => s + Number(v.monto_pagado), 0);
        const meta           = personas.length * META_POR_PERSONA;
        const listosCount    = ventas.filter(v => Number(v.monto_pagado) >= META_POR_PERSONA).length;

        // -- Solo 2 cajas: META y RECAUDADO --
        let y = 44;
        const boxW = 84;  // cajas mas anchas ya que solo son 2
        const box = (label, value, x, borderColor) => {
            doc.setDrawColor(...borderColor);
            doc.setLineWidth(0.7);
            doc.roundedRect(x, y, boxW, 24, 2, 2, 'S');
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...cGrey);
            doc.text(label, x + 4, y + 8);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...cWhite);
            doc.text(value, x + 4, y + 19);
        };
        box('META TOTAL DE LA ALCANTARILLA', '$' + meta.toLocaleString(), 14, cGreen);
        box('RECOGIDO HASTA AHORA',          '$' + totalRecaudado.toLocaleString(), 102, cYellow);

        // -- Tabla alfabetica: NOMBRE, PAGADO, ESTADO --
        y += 34;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...cWhite);
        doc.text('ESTADO POR INTEGRANTE', 14, y);
        doc.setDrawColor(...cGreen);
        doc.setLineWidth(0.5);
        doc.line(14, y + 2, 85, y + 2);

        const personasAZ = [...personas].sort((a, b) => a.nombre.localeCompare(b.nombre));
        const rows = personasAZ.map(p => {
            const venta  = ventas.find(v => v.persona_id === p.id || v.persona_nombre === p.nombre);
            const pagado = venta ? Number(venta.monto_pagado) : 0;
            return [
                p.nombre.toUpperCase(),
                '$' + pagado.toLocaleString(),
                pagado >= META_POR_PERSONA ? 'PAGADO' : 'PENDIENTE'
            ];
        });

        autoTable(doc, {
            head: [['INTEGRANTE', 'MONTO PAGADO', 'ESTADO']],
            body: rows,
            startY: y + 6,
            theme: 'plain',
            headStyles: {
                fillColor: false,
                textColor: cGreen,
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'center',
                lineColor: cGreen,
                lineWidth: 0.4
            },
            styles: {
                fontSize: 8,
                textColor: cWhite,
                fillColor: false,
                cellPadding: 3,
                lineColor: [70, 70, 70],
                lineWidth: 0.2
            },
            alternateRowStyles: { fillColor: false },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { halign: 'right' },
                2: { halign: 'center', fontStyle: 'bold' }
            },
            didParseCell(data) {
                if (data.column.index === 2 && data.section === 'body') {
                    data.cell.styles.textColor = data.cell.raw === 'PAGADO' ? cGreen : cYellow;
                }
                data.cell.styles.fillColor = false;
            }
        });

        // -- Footer --
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
                    <p style={{ color: 'var(--text-muted)' }}>Cada integrante: <b style={{ color: 'var(--primary)' }}>10 boletas × $3.000 = $30.000</b> antes de jugar · Premio fijo</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setShowModal(true); setError(''); }}>
                    <Plus size={18} /> Nueva Alcantarilla
                </button>
            </header>

            {/* ── REGLA DE NEGOCIO INFO ── */}
            <div style={{
                background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '12px', padding: '0.9rem 1.2rem', marginBottom: '1.5rem',
                display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.85rem', alignItems: 'center'
            }}>
                <span>🎟️ <b>Boletas por integrante:</b> {BOLETAS_POR_PERSONA}</span>
                <span>💵 <b>Precio por boleta:</b> ${PRECIO_BOLETA.toLocaleString()}</span>
                <span>💰 <b>Meta por integrante:</b> ${META_POR_PERSONA.toLocaleString()}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)' }}>
                    📦 Total esperado: ${(personas.length * META_POR_PERSONA).toLocaleString()}
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '6px' }}>
                        ({personas.length} integrantes × ${META_POR_PERSONA.toLocaleString()})
                    </span>
                </span>
            </div>

            {/* ── STATS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
                <StatCard label="Alcantarillas" value={stats.total_alcantarillas} icon={Trophy} color="245,158,11" />
                <StatCard
                    label="Total Recaudado"
                    value={`$${Number(stats.total_recaudado).toLocaleString()}`}
                    icon={DollarSign} color="16,185,129"
                    sub={`Meta total: $${(personas.length * META_POR_PERSONA).toLocaleString()}`}
                />
                <StatCard
                    label="Ganancia si todos pagan"
                    value={`$${Number(stats.ganancia_proyectada).toLocaleString()}`}
                    icon={TrendingUp}
                    color="34,211,238"
                    sub={`${personas.length} × $${META_POR_PERSONA.toLocaleString()} − premios`}
                />
                <StatCard
                    label="Progreso de Recaudo"
                    value={stats.total_recaudado > 0
                        ? `${Math.min(100, ((stats.total_recaudado / (personas.length * META_POR_PERSONA * (stats.total_alcantarillas || 1))) * 100)).toFixed(1)}%`
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
                const ventas        = ventasPorAlc[alc.id] || [];
                const totalVendido  = Number(alc.total_recaudado);
                const ganancia      = totalVendido - Number(alc.costo_premio);
                const totalBoletas  = personas.length * BOLETAS_POR_PERSONA;
                const boletasVendidas = ventas.reduce((s, v) => s + v.unidades_vendidas, 0);
                const pctGlobal     = totalBoletas > 0 ? Math.min((boletasVendidas / totalBoletas) * 100, 100) : 0;
                const listosParaJugar = ventas.filter(v => Number(v.monto_pagado) >= META_POR_PERSONA).length;

                return (
                    <div key={alc.id} className="card" style={{ marginBottom: '1rem', padding: 0, overflow: 'hidden' }}>

                        {/* Cabecera */}
                        <div
                            onClick={() => toggleExpandir(alc.id)}
                            style={{ padding: '1.2rem 1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}
                        >
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>🎰 {alc.nombre}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {new Date(alc.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    {' · '}{listosParaJugar}/{alc.personas_registradas} integrantes completos
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
                                    Ventas por integrante ({ventas.length} / {personas.length})
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
                                                            <BadgePago montoPagado={Number(v.monto_pagado)} />
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
                                                <BarraProgreso vendidas={v.unidades_vendidas} tope={alc.tope_por_persona} />
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

                        {/* Reglas fijas visibles */}
                        <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '0.82rem', lineHeight: '1.7' }}>
                            🎟️ <b>10 boletas</b> por integrante · 💵 <b>$3.000</b> c/u · 💰 Meta: <b>$30.000</b> por persona
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem', color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem' }}>
                                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />{error}
                            </div>
                        )}

                        <form onSubmit={handleCrearAlcantarilla}>
                            <div className="form-group">
                                <label>Nombre del Evento *</label>
                                <input required placeholder="Ej: Alcantarilla Trimestre 1 – Abril" value={formAlc.nombre}
                                    onChange={e => setFormAlc(p => ({ ...p, nombre: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label>Fecha *</label>
                                <input type="date" required value={formAlc.fecha}
                                    onChange={e => setFormAlc(p => ({ ...p, fecha: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label>Precio del Premio ($) — fijo por evento</label>
                                <input type="number" min="0" placeholder="Ej: 50000" value={formAlc.costo_premio}
                                    onChange={e => setFormAlc(p => ({ ...p, costo_premio: e.target.value }))} />
                            </div>

                            {/* Campos fijos — solo informativos */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <div>Precio boleta: <b style={{ color: 'var(--text)' }}>${PRECIO_BOLETA.toLocaleString()}</b></div>
                                <div>Tope por persona: <b style={{ color: 'var(--text)' }}>{BOLETAS_POR_PERSONA} boletas</b></div>
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
                const alc = alcantarillas.find(a => a.id === showVentaModal);
                const ventasActuales = ventasPorAlc[showVentaModal] || [];
                const personasYaRegistradas = new Set(ventasActuales.map(v => v.persona_id));
                const personasDisponibles = personas.filter(p => !personasYaRegistradas.has(p.id));
                const montoCalculado = formVenta.unidades_vendidas ? formVenta.unidades_vendidas * PRECIO_BOLETA : 0;
                const esCompleto     = Number(formVenta.unidades_vendidas) === BOLETAS_POR_PERSONA;

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

                            {error && (
                                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem', color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem' }}>
                                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />{error}
                                </div>
                            )}

                            <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '0.75rem', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
                                🎟️ Máximo <b>{BOLETAS_POR_PERSONA} boletas</b> × <b>${PRECIO_BOLETA.toLocaleString()}</b> = <b style={{ color: 'var(--primary)' }}>${META_POR_PERSONA.toLocaleString()}</b> por integrante
                            </div>

                            <form onSubmit={handleRegistrarVenta}>
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
                                <div className="form-group">
                                    <label>Boletas Entregadas (máx. {BOLETAS_POR_PERSONA}) *</label>
                                    <input type="number" required min="1" max={BOLETAS_POR_PERSONA}
                                        placeholder={`1 – ${BOLETAS_POR_PERSONA}`}
                                        value={formVenta.unidades_vendidas}
                                        onChange={e => setFormVenta(p => ({ ...p, unidades_vendidas: e.target.value }))} />
                                </div>

                                {formVenta.unidades_vendidas && (
                                    <div style={{
                                        background: esCompleto ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                                        border: `1px solid ${esCompleto ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                                        borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <span style={{ fontSize: '0.85rem' }}>
                                            {esCompleto ? '✅ Cuota completa' : `⚠ Falta ${META_POR_PERSONA - montoCalculado > 0 ? '$' + (META_POR_PERSONA - montoCalculado).toLocaleString() : ''}`}
                                        </span>
                                        <b style={{ color: esCompleto ? 'var(--success)' : 'var(--warning)', fontSize: '1rem' }}>
                                            ${montoCalculado.toLocaleString()}
                                        </b>
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
