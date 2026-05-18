import React, { useEffect, useState } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
    Building2, TrendingUp, Wallet, AlertCircle, CreditCard,
    HandCoins, Target, RefreshCw, Layers
} from 'lucide-react';
import { bancoApi } from '../api';

const COLORES_FUENTES = ['#10b981', '#f59e0b', '#6366f1'];
const COLORES_METAS   = ['#10b981','#22d3ee','#a78bfa','#f472b6','#fb923c','#34d399','#60a5fa'];

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-CO')}`;

const FuenteCard = ({ label, monto, total, icon: Icon, color, extraText }) => {
    const pct = total > 0 ? ((monto / total) * 100).toFixed(1) : 0;
    return (
        <div className="card" style={{ padding: '1.5rem', borderTop: `3px solid ${color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{label}</p>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color }}>{fmt(monto)}</div>
                </div>
                <div style={{ padding: '0.75rem', borderRadius: '12px', background: `${color}18` }}>
                    <Icon size={22} color={color} />
                </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', height: '6px', borderRadius: '20px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 1s ease-out' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{pct}% del fondo total</p>
                {extraText && <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0, color: 'var(--danger)' }}>{extraText}</p>}
            </div>
        </div>
    );
};

const CustomTooltipPie = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const d = payload[0];
        return (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
                <p style={{ fontWeight: 700, color: d.payload.fill }}>{d.name}</p>
                <p style={{ color: 'var(--text)' }}>{fmt(d.value)}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{d.payload.porcentaje}%</p>
            </div>
        );
    }
    return null;
};

const BancoGeneral = () => {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    const cargarDatos = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await bancoApi.getFondoGlobal();
            setData(res.data);
            setLastUpdate(new Date());
        } catch (err) {
            setError('Error cargando el fondo global. Verifique la conexión.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', border: '3px solid var(--surface)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'var(--text-muted)' }}>Cargando Banco General VDR...</p>
        </div>
    );

    if (error) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <div className="card" style={{ textAlign: 'center', padding: '2rem', maxWidth: '400px' }}>
                <AlertCircle size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--danger)' }}>{error}</p>
            </div>
        </div>
    );

    const { fondo_total, fondo_patrimonial, fuentes, metas, capital_prestado_activo, historico_por_mes } = data;

    // Datos para la torta de fuentes
    const pieData = [
        { name: 'Cuotas Quincenales', value: fuentes.cuotas,             porcentaje: fondo_total > 0 ? ((fuentes.cuotas/fondo_total)*100).toFixed(1) : 0 },
        { name: 'La Alcantarilla',     value: fuentes.alcantarilla,       porcentaje: fondo_total > 0 ? ((fuentes.alcantarilla/fondo_total)*100).toFixed(1) : 0 },
        { name: 'Intereses Préstamos', value: fuentes.intereses_prestamos, porcentaje: fondo_total > 0 ? ((fuentes.intereses_prestamos/fondo_total)*100).toFixed(1) : 0 },
    ].filter(d => d.value > 0);

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
            {/* Header */}
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{ background: 'var(--primary)', padding: '0.6rem', borderRadius: '12px', display: 'flex' }}>
                            <Building2 color="black" size={22} strokeWidth={2.5} />
                        </div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px', margin: 0 }}>Banco General VDR</h1>
                    </div>
                    <p style={{ color: 'var(--text-muted)' }}>Consolidado de todos los fondos recaudados por actividad</p>
                </div>
                <button
                    id="btn-refresh-banco"
                    className="btn btn-ghost"
                    onClick={cargarDatos}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}
                >
                    <RefreshCw size={16} />
                    <span style={{ fontSize: '0.75rem' }}>
                        Actualizado: {lastUpdate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </button>
            </header>

            {/* Fondo Total — tarjeta hero */}
            <div className="card" style={{
                background: 'linear-gradient(135deg, #065f46 0%, #0a0a0a 60%)',
                padding: '2.5rem',
                marginBottom: '1.5rem',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(16,185,129,0.2)'
            }}>
                <Layers style={{ position: 'absolute', right: '-20px', bottom: '-20px', width: '160px', height: '160px', opacity: 0.04, color: '#10b981' }} />
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Efectivo Líquido Disponible (En Caja)
                </p>
                <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#10b981', letterSpacing: '-2px', lineHeight: 1 }}>
                    {fmt(fondo_total)}
                </div>
                <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.2rem' }}>💰 Fondo Patrimonial Total</p>
                        <p style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1.2rem' }}>{fmt(fondo_patrimonial)}</p>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>(Efectivo + Préstamos)</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.2rem' }}>💸 Capital en Préstamos (En circulación)</p>
                        <p style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1.2rem' }}>{fmt(capital_prestado_activo)}</p>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>(Dinero que debe retornar)</p>
                    </div>
                </div>
            </div>

            {/* Fuentes de ingreso */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <FuenteCard 
                    label="Saldo Líquido Cuotas"  
                    monto={fuentes.cuotas}               
                    total={fondo_total} 
                    icon={Wallet}     
                    color="#10b981" 
                    extraText={
                        (fuentes.penalizaciones_total > 0 || fuentes.penalizaciones_pendientes_monto > 0) ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', fontSize: '0.65rem', textAlign: 'right', fontWeight: 'bold' }}>
                                <span style={{ color: 'var(--danger)' }}>Multas Cobradas: {fmt(fuentes.penalizaciones_total)}</span>
                                <span style={{ color: 'var(--warning)' }}>Multas Por Cobrar: {fmt(fuentes.penalizaciones_pendientes_monto)}</span>
                            </div>
                        ) : null
                    }
                />
                <FuenteCard label="Saldo Líquido Alcantarilla" monto={fuentes.alcantarilla}      total={fondo_total} icon={CreditCard} color="#f59e0b" />
                <FuenteCard label="Ganancias (Intereses)"  monto={fuentes.intereses_prestamos}   total={fondo_total} icon={HandCoins}  color="#6366f1" />
            </div>

            {/* Gráficos y distribución */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

                {/* Torta de fuentes */}
                <div className="card" style={{ padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={18} color="var(--primary)" /> Distribución del Efectivo Disponible
                    </h3>
                    {pieData.length > 0 ? (
                        <div style={{ height: '260px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={90}
                                        innerRadius={50}
                                        paddingAngle={3}
                                    >
                                        {pieData.map((_, i) => (
                                            <Cell key={i} fill={COLORES_FUENTES[i % COLORES_FUENTES.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltipPie />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                {pieData.map((d, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORES_FUENTES[i], flexShrink: 0 }} />
                                        <span style={{ color: 'var(--text-muted)', flex: 1 }}>{d.name}</span>
                                        <span style={{ fontWeight: 700 }}>{d.porcentaje}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <Wallet size={40} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                            <p>Sin ingresos registrados aún</p>
                        </div>
                    )}
                </div>

                {/* Histórico cuotas */}
                <div className="card" style={{ padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={18} color="#10b981" /> Histórico Cuotas (últimos 12 meses)
                    </h3>
                    <div style={{ height: '280px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={historico_por_mes || []}>
                                <defs>
                                    <linearGradient id="gradBanco" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', borderRadius: '12px' }}
                                    formatter={(v) => [fmt(v), 'Cuotas']}
                                />
                                <Area type="monotone" dataKey="cuotas" stroke="#10b981" fill="url(#gradBanco)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Distribución por metas */}
            <div className="card" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={18} color="var(--accent)" /> Distribución del Fondo por Metas
                </h3>
                {metas && metas.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {metas.map((m, i) => (
                            <div key={m.id} style={{
                                padding: '1.25rem',
                                borderRadius: '16px',
                                background: 'rgba(255,255,255,0.02)',
                                border: `1px solid ${COLORES_METAS[i % COLORES_METAS.length]}30`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>{m.nombre}</div>
                                        {m.descripcion && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.descripcion}</div>}
                                    </div>
                                    <span style={{
                                        background: `${COLORES_METAS[i % COLORES_METAS.length]}22`,
                                        color: COLORES_METAS[i % COLORES_METAS.length],
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: 700
                                    }}>{m.porcentaje}%</span>
                                </div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: COLORES_METAS[i % COLORES_METAS.length], marginBottom: '0.75rem' }}>
                                    {fmt(m.monto_disponible)}
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', height: '6px', borderRadius: '20px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${m.porcentaje}%`,
                                        height: '100%',
                                        background: COLORES_METAS[i % COLORES_METAS.length],
                                        transition: 'width 1s ease-out'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        <Target size={40} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                        <p>No hay metas configuradas. Configúralas en <b>Gestión Metas</b>.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BancoGeneral;
