import React, { useEffect, useState, useCallback } from 'react';
import {
    HandCoins, Plus, X, CheckCircle2, Clock, AlertCircle,
    Trash2, ChevronRight, ArrowLeft, DollarSign, User,
    Calendar, FileText, TrendingUp, Banknote
} from 'lucide-react';
import { prestamosApi, personasApi } from '../api';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-CO')}`;

const ESTADO_STYLES = {
    activo:  { color: '#f59e0b', bg: '#f59e0b20', label: 'Activo',  icon: Clock },
    pagado:  { color: '#10b981', bg: '#10b98120', label: 'Pagado',  icon: CheckCircle2 },
    vencido: { color: '#ef4444', bg: '#ef444420', label: 'Vencido', icon: AlertCircle  },
};

const TIPO_ABONO_LABELS = { capital: 'Capital', interes: 'Interés', mixto: 'Mixto' };

const EstadoBadge = ({ estado }) => {
    const s = ESTADO_STYLES[estado] || ESTADO_STYLES.activo;
    const Icon = s.icon;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: s.bg, color: s.color, padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}>
            <Icon size={12} /> {s.label}
        </span>
    );
};

const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="card stat-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <span className="stat-label">{label}</span>
                <div className="stat-value" style={{ color }}>{value}</div>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '12px', background: `${color}18` }}>
                <Icon size={22} color={color} />
            </div>
        </div>
    </div>
);

// ─── Modal Crear Préstamo ────────────────────────────────────────────────────
const ModalCrearPrestamo = ({ personas, onClose, onCreado }) => {
    const hoy = new Date().toISOString().split('T')[0];
    const [form, setForm] = useState({
        responsable: '',
        monto_original: '',
        interes_cobrado: '',
        fecha_prestamo: hoy,
        fecha_vencimiento: '',
        fuente_id: 'cuotas',
        notas: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.responsable || !form.monto_original || !form.fecha_prestamo || !form.fecha_vencimiento) {
            setError('Completa los campos obligatorios.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await prestamosApi.create({
                ...form,
                monto_original:  Number(form.monto_original),
                interes_cobrado: Number(form.interes_cobrado || 0),
            });
            onCreado();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al crear el préstamo.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
            <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '2rem', position: 'relative' }}>
                <button id="btn-cerrar-modal-prestamo" onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={20} />
                </button>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.3rem' }}>
                    <HandCoins size={20} color="var(--primary)" /> Nuevo Préstamo
                </h2>

                {error && <div style={{ background: '#ef444420', border: '1px solid #ef444460', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.9rem' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Responsable / Deudor *</label>
                        <select 
                            id="input-responsable" 
                            name="responsable" 
                            value={form.responsable} 
                            onChange={handleChange} 
                            className="input" 
                            required
                        >
                            <option value="">Seleccionar integrante...</option>
                            {personas.map(p => (
                                <option key={p.id} value={p.nombre}>{p.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Fondo de Origen (De donde sale la plata) *</label>
                        <select 
                            name="fuente_id" 
                            value={form.fuente_id} 
                            onChange={handleChange} 
                            className="input" 
                            required
                        >
                            <option value="cuotas">Pagos Quincenales</option>
                            <option value="alcantarilla">La Alcantarilla</option>
                            <option value="ganancias">Intereses y Ganancias Propias</option>
                        </select>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            Este monto se descontará del saldo disponible en el Banco General.
                        </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Capital Prestado ($) *</label>
                            <input id="input-monto-original" name="monto_original" type="number" min="0" step="100" value={form.monto_original} onChange={handleChange} placeholder="Ej: 500000" className="input" required />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Interés Acordado ($)</label>
                            <input id="input-interes-cobrado" name="interes_cobrado" type="number" min="0" step="100" value={form.interes_cobrado} onChange={handleChange} placeholder="Ej: 50000" className="input" />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Fecha Préstamo *</label>
                            <input id="input-fecha-prestamo" name="fecha_prestamo" type="date" value={form.fecha_prestamo} onChange={handleChange} className="input" required />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Fecha Vencimiento *</label>
                            <input id="input-fecha-vencimiento" name="fecha_vencimiento" type="date" value={form.fecha_vencimiento} onChange={handleChange} className="input" required />
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Notas (opcional)</label>
                        <textarea id="input-notas-prestamo" name="notas" value={form.notas} onChange={handleChange} placeholder="Observaciones del préstamo..." className="input" rows={2} style={{ resize: 'vertical' }} />
                    </div>

                    {form.monto_original && (
                        <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '1rem', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Capital:</span>
                                <span style={{ fontWeight: 700 }}>{fmt(form.monto_original)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Interés acordado:</span>
                                <span style={{ fontWeight: 700, color: '#6366f1' }}>{fmt(form.interes_cobrado || 0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Total a cobrar:</span>
                                <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>
                                    {fmt(Number(form.monto_original || 0) + Number(form.interes_cobrado || 0))}
                                </span>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
                        <button id="btn-guardar-prestamo" type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
                            {saving ? 'Guardando...' : 'Registrar Préstamo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Modal Registrar Abono ────────────────────────────────────────────────────
const ModalAbono = ({ prestamo, onClose, onAbonado }) => {
    const hoy = new Date().toISOString().split('T')[0];
    const [form, setForm] = useState({ 
        fecha_abono: hoy, 
        monto_abono: '', 
        tipo_abono: 'mixto', 
        capital_pagado: 0,
        interes_pagado: 0,
        notas: '' 
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Calcular desgloses sugeridos cuando cambia el monto o tipo
    useEffect(() => {
        const monto = Number(form.monto_abono || 0);
        let cap = 0;
        let int = 0;

        if (form.tipo_abono === 'interes') {
            int = monto;
        } else if (form.tipo_abono === 'capital') {
            cap = monto;
        } else {
            // Mixto: Priorizar interés pendiente
            const intPendiente = (prestamo.interes_cobrado || 0) - (prestamo.intereses_abonados || 0);
            int = Math.min(monto, Math.max(0, intPendiente));
            cap = monto - int;
        }

        setForm(prev => ({ ...prev, capital_pagado: cap, interes_pagado: int }));
    }, [form.monto_abono, form.tipo_abono, prestamo.interes_cobrado, prestamo.intereses_abonados]);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.monto_abono || Number(form.monto_abono) <= 0) { setError('El monto del abono debe ser mayor a $0.'); return; }
        setSaving(true); setError(null);
        try {
            await prestamosApi.registrarAbono(prestamo.id, { 
                ...form, 
                monto_abono: Number(form.monto_abono),
                capital_pagado: Number(form.capital_pagado),
                interes_pagado: Number(form.interes_pagado)
            });
            onAbonado();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al registrar abono.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1001, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
            <div className="card" style={{ width: '100%', maxWidth: '460px', padding: '2rem', position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '1.2rem' }}>
                    <Banknote size={18} color="var(--primary)" /> Registrar Abono
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Saldo pendiente: <b style={{ color: '#f59e0b' }}>{fmt(prestamo.saldo_pendiente)}</b>
                </p>

                {error && <div style={{ background: '#ef444420', border: '1px solid #ef444460', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.85rem' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Fecha del Abono</label>
                            <input name="fecha_abono" type="date" value={form.fecha_abono} onChange={handleChange} className="input" required />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Tipo de Abono</label>
                            <select name="tipo_abono" value={form.tipo_abono} onChange={handleChange} className="input">
                                <option value="mixto">Mixto (capital + interés)</option>
                                <option value="capital">Solo Capital</option>
                                <option value="interes">Solo Interés</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Monto Total del Abono ($) *</label>
                        <input name="monto_abono" type="number" min="0" step="100" value={form.monto_abono} onChange={handleChange} placeholder="Ej: 100000" className="input" required />
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Desglose del pago</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>A Capital</label>
                                <input name="capital_pagado" type="number" value={form.capital_pagado} onChange={handleChange} className="input" style={{ fontSize: '0.9rem', padding: '0.4rem 0.6rem' }} />
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>Retorno de dinero prestado</p>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', color: '#6366f1', display: 'block', marginBottom: '0.2rem' }}>A Ganancia (Interés)</label>
                                <input name="interes_pagado" type="number" value={form.interes_pagado} onChange={handleChange} className="input" style={{ fontSize: '0.9rem', padding: '0.4rem 0.6rem', borderColor: '#6366f140' }} />
                                <p style={{ fontSize: '0.65rem', color: '#6366f190', marginTop: '4px' }}>Dinero que suma al Banco</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Notas</label>
                        <input name="notas" value={form.notas} onChange={handleChange} placeholder="Opcional..." className="input" />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
                            {saving ? 'Guardando...' : 'Registrar Abono'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Vista Detalle de Préstamo ────────────────────────────────────────────────
const DetallePrestamo = ({ prestamoId, onVolver, onActualizado }) => {
    const [detalle, setDetalle]     = useState(null);
    const [loading, setLoading]     = useState(true);
    const [showAbono, setShowAbono] = useState(false);
    const [showEditEstado, setShowEditEstado] = useState(false);

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const res = await prestamosApi.getById(prestamoId);
            setDetalle(res.data);
        } catch {
            setDetalle(null);
        } finally {
            setLoading(false);
        }
    }, [prestamoId]);

    useEffect(() => { cargar(); }, [cargar]);

    const eliminarAbono = async (id) => {
        if (!window.confirm('¿Eliminar este abono?')) return;
        await prestamosApi.eliminarAbono(id);
        cargar();
        onActualizado();
    };

    const cambiarEstado = async (nuevoEstado) => {
        await prestamosApi.update(prestamoId, { ...detalle, estado: nuevoEstado, abonos: undefined });
        setShowEditEstado(false);
        cargar();
        onActualizado();
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Cargando detalle...</div>;
    if (!detalle) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--danger)' }}>No se encontró el préstamo.</div>;

    const pctAbonado = detalle.total_a_pagar > 0 ? Math.min((detalle.total_abonado / detalle.total_a_pagar) * 100, 100) : 0;
    const estilo = ESTADO_STYLES[detalle.estado] || ESTADO_STYLES.activo;

    return (
        <div className="animate-fade-in">
            <button id="btn-volver-lista-prestamos" onClick={onVolver} className="btn btn-ghost" style={{ marginBottom: '1.5rem', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <ArrowLeft size={16} /> Volver a la lista
            </button>

            {/* Header del préstamo */}
            <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem', borderLeft: `4px solid ${estilo.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{detalle.responsable}</h2>
                            <EstadoBadge estado={detalle.estado} />
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <span><Calendar size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Prestado: <b style={{ color: 'var(--text)' }}>{detalle.fecha_prestamo?.split('T')[0]}</b></span>
                            <span><Calendar size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Vence: <b style={{ color: estilo.color }}>{detalle.fecha_vencimiento?.split('T')[0]}</b></span>
                        </div>
                        {detalle.notas && <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{detalle.notas}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button id="btn-cambiar-estado-prestamo" onClick={() => setShowEditEstado(!showEditEstado)} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>
                            Cambiar Estado
                        </button>
                        <button id="btn-registrar-abono" onClick={() => setShowAbono(true)} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                            <Plus size={14} /> Abono
                        </button>
                    </div>
                </div>

                {showEditEstado && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                        {['activo', 'pagado', 'vencido'].map(e => (
                            <button key={e} onClick={() => cambiarEstado(e)} className="btn btn-ghost" style={{
                                fontSize: '0.8rem', borderColor: ESTADO_STYLES[e].color,
                                color: ESTADO_STYLES[e].color, padding: '0.3rem 0.75rem'
                            }}>
                                {ESTADO_STYLES[e].label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Resumen financiero */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Capital Prestado',   value: fmt(detalle.monto_original),  color: '#f59e0b' },
                    { label: 'Interés Acordado',   value: fmt(detalle.interes_cobrado), color: '#6366f1' },
                    { label: 'Total a Cobrar',      value: fmt(detalle.total_a_pagar),   color: '#22d3ee' },
                    { label: 'Total Abonado',       value: fmt(detalle.total_abonado),   color: '#10b981' },
                    { label: 'Saldo Pendiente',     value: fmt(detalle.saldo_pendiente), color: detalle.saldo_pendiente > 0 ? '#ef4444' : '#10b981' },
                ].map((s, i) => (
                    <div key={i} className="card" style={{ padding: '1rem', borderTop: `3px solid ${s.color}` }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{s.label}</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: 800, color: s.color }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Barra de progreso */}
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Progreso de pago</span>
                    <span style={{ fontWeight: 700, color: pctAbonado >= 100 ? 'var(--success)' : 'var(--primary)' }}>{pctAbonado.toFixed(1)}%</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', height: '12px', borderRadius: '20px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${pctAbonado}%`, height: '100%', borderRadius: '20px',
                        background: pctAbonado >= 100 ? 'var(--success)' : 'var(--primary)',
                        transition: 'width 1s ease-out', boxShadow: '0 0 10px rgba(16,185,129,0.4)'
                    }} />
                </div>
            </div>

            {/* Historial de abonos */}
            <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} color="var(--primary)" /> Historial de Abonos
                </h3>
                {detalle.abonos && detalle.abonos.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {detalle.abonos.map(a => (
                            <div key={a.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.875rem 1rem', borderRadius: '12px',
                                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: '50%',
                                        background: a.tipo_abono === 'interes' ? '#6366f120' : a.tipo_abono === 'capital' ? '#10b98120' : '#22d3ee20',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Banknote size={16} color={a.tipo_abono === 'interes' ? '#6366f1' : a.tipo_abono === 'capital' ? '#10b981' : '#22d3ee'} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                            {fmt(a.monto_abono)}
                                            <span style={{
                                                marginLeft: '0.5rem', fontSize: '0.7rem', fontWeight: 700,
                                                color: a.tipo_abono === 'interes' ? '#6366f1' : a.tipo_abono === 'capital' ? '#10b981' : '#22d3ee',
                                                background: a.tipo_abono === 'interes' ? '#6366f115' : a.tipo_abono === 'capital' ? '#10b98115' : '#22d3ee15',
                                                padding: '0.1rem 0.4rem', borderRadius: '4px'
                                            }}>
                                                {TIPO_ABONO_LABELS[a.tipo_abono]}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {a.fecha_abono?.split('T')[0]}
                                            {a.notas && ` — ${a.notas}`}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => eliminarAbono(a.id)} className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--danger)', opacity: 0.6 }}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        <Banknote size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.2 }} />
                        <p style={{ fontSize: '0.9rem' }}>Sin abonos registrados aún.</p>
                    </div>
                )}
            </div>

            {showAbono && (
                <ModalAbono
                    prestamo={detalle}
                    onClose={() => setShowAbono(false)}
                    onAbonado={() => { cargar(); onActualizado(); }}
                />
            )}
        </div>
    );
};

// ─── Página Principal Préstamos ───────────────────────────────────────────────
const Prestamos = () => {
    const [prestamos, setPrestamos]       = useState([]);
    const [stats, setStats]               = useState(null);
    const [personas, setPersonas]         = useState([]);
    const [loading, setLoading]           = useState(true);
    const [showModal, setShowModal]       = useState(false);
    const [detalleId, setDetalleId]       = useState(null);
    const [filtro, setFiltro]             = useState('todos');
    const [busqueda, setBusqueda]         = useState('');

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const [listaRes, statsRes, personasRes] = await Promise.all([
                prestamosApi.getAll(),
                prestamosApi.getStats(),
                personasApi.getAll()
            ]);
            setPrestamos(listaRes.data);
            setStats(statsRes.data);
            setPersonas(personasRes.data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const eliminarPrestamo = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('¿Eliminar este préstamo y todos sus abonos?')) return;
        await prestamosApi.delete(id);
        cargar();
    };

    const listaFiltrada = prestamos
        .filter(p => filtro === 'todos' || p.estado === filtro)
        .filter(p => !busqueda || p.responsable.toLowerCase().includes(busqueda.toLowerCase()));

    // Vista de detalle
    if (detalleId) return (
        <DetallePrestamo
            prestamoId={detalleId}
            onVolver={() => setDetalleId(null)}
            onActualizado={cargar}
        />
    );

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
            {/* Header */}
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{ background: '#6366f1', padding: '0.6rem', borderRadius: '12px', display: 'flex' }}>
                            <HandCoins color="white" size={22} strokeWidth={2.5} />
                        </div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px', margin: 0 }}>Sistema de Préstamos</h1>
                    </div>
                    <p style={{ color: 'var(--text-muted)' }}>Control de cartera — capital prestado, intereses y abonos</p>
                </div>
                <button id="btn-nuevo-prestamo" onClick={() => setShowModal(true)} className="btn btn-primary" style={{ gap: '0.5rem' }}>
                    <Plus size={18} /> Nuevo Préstamo
                </button>
            </header>

            {/* Stats */}
            {stats && (
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '1.5rem' }}>
                    <StatCard label="Capital Prestado"    value={fmt(stats.capital_total_prestado)}  icon={DollarSign}  color="#f59e0b" />
                    <StatCard label="Intereses Esperados" value={fmt(stats.intereses_esperados)}     icon={TrendingUp}  color="#6366f1" />
                    <StatCard label="Intereses Cobrados"  value={fmt(stats.intereses_cobrados)}      icon={HandCoins}   color="#10b981" />
                    <StatCard label="Saldo Pendiente"     value={fmt(stats.saldo_pendiente)}         icon={AlertCircle} color="#ef4444" />
                    <StatCard label="Préstamos Activos"   value={stats.activos}                      icon={Clock}       color="#22d3ee" />
                    <StatCard label="Pagados"             value={stats.pagados}                      icon={CheckCircle2}color="#10b981" />
                </div>
            )}

            {/* Filtros y búsqueda */}
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                    id="input-busqueda-prestamos"
                    placeholder="Buscar por responsable..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="input"
                    style={{ flex: 1, minWidth: '200px' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['todos', 'activo', 'pagado', 'vencido'].map(f => (
                        <button
                            key={f}
                            id={`btn-filtro-${f}`}
                            onClick={() => setFiltro(f)}
                            className={`btn ${filtro === f ? 'btn-primary' : 'btn-ghost'}`}
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', ...(f !== 'todos' && { color: ESTADO_STYLES[f]?.color }) }}
                        >
                            {f === 'todos' ? 'Todos' : ESTADO_STYLES[f]?.label}
                            {f !== 'todos' && stats && (
                                <span style={{ marginLeft: '0.3rem', fontSize: '0.7rem', fontWeight: 800 }}>
                                    ({stats[`${f}s`] || 0})
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lista de préstamos */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Cargando préstamos...</div>
            ) : listaFiltrada.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <HandCoins size={48} style={{ margin: '0 auto 1rem', opacity: 0.15 }} />
                    <p style={{ color: 'var(--text-muted)' }}>
                        {prestamos.length === 0 ? 'No hay préstamos registrados.' : 'No se encontraron préstamos con ese filtro.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {listaFiltrada.map(p => {
                        const pct = p.total_a_pagar > 0 ? Math.min((p.total_abonado / p.total_a_pagar) * 100, 100) : 0;
                        const estilo = ESTADO_STYLES[p.estado] || ESTADO_STYLES.activo;
                        return (
                            <div
                                key={p.id}
                                id={`prestamo-row-${p.id}`}
                                onClick={() => setDetalleId(p.id)}
                                className="card"
                                style={{
                                    padding: '1.25rem 1.5rem', cursor: 'pointer',
                                    borderLeft: `4px solid ${estilo.color}`,
                                    transition: 'transform 0.15s, box-shadow 0.15s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${estilo.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <User size={16} color={estilo.color} />
                                            </div>
                                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{p.responsable}</span>
                                            <EstadoBadge estado={p.estado} />
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                            Prestado: {p.fecha_prestamo?.split('T')[0]} — Vence: <span style={{ color: estilo.color }}>{p.fecha_vencimiento?.split('T')[0]}</span>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.04)', height: '5px', borderRadius: '10px', overflow: 'hidden' }}>
                                            <div style={{ width: `${pct}%`, height: '100%', background: estilo.color, transition: 'width 1s ease-out' }} />
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-end' }}>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>{fmt(p.total_a_pagar)}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            Capital: {fmt(p.monto_original)} + Interés: {fmt(p.interes_cobrado)}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: p.saldo_pendiente > 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                                            Saldo: {fmt(p.saldo_pendiente)}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <button
                                            onClick={(e) => eliminarPrestamo(p.id, e)}
                                            className="btn btn-ghost"
                                            style={{ padding: '0.4rem', color: 'var(--danger)', opacity: 0.5 }}
                                            title="Eliminar préstamo"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <ChevronRight size={16} color="var(--text-muted)" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <ModalCrearPrestamo
                    personas={personas}
                    onClose={() => setShowModal(false)}
                    onCreado={cargar}
                />
            )}
        </div>
    );
};

export default Prestamos;
