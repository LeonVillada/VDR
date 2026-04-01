import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { Wallet, Users, AlertCircle, TrendingUp, CheckCircle2, Clock, ArrowUpRight, PieChart, Target } from 'lucide-react';
import { pagosApi, personasApi, metasApi } from '../api';

const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="card stat-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <span className="stat-label">{label}</span>
                <div className="stat-value">{value}</div>
            </div>
            <div style={{
                padding: '0.75rem',
                borderRadius: '12px',
                background: `rgba(${color}, 0.1)`,
                color: `rgb(${color})`
            }}>
                <Icon size={24} />
            </div>
        </div>
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState({ total: 0, porMes: [] });
    const [personas, setPersonas] = useState([]);
    const [metas, setMetas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, personasRes, metasRes] = await Promise.all([
                    pagosApi.getStats(),
                    personasApi.getAll(),
                    metasApi.getAll()
                ]);
                setStats(statsRes.data);
                const sortedPersonas = personasRes.data.sort((a, b) => a.nombre.localeCompare(b.nombre));
                setPersonas(sortedPersonas);
                setMetas(metasRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const totalDeuda = personas.reduce((sum, p) => sum + (p.total_deuda || 0), 0);
    const deudores = personas.filter(p => p.quincenas_pendientes > 0).length;

    // Proyección Anual 2026: Suma de la expectativa máxima anual por cada usuario.
    // Dado que ahora es dinámico según fecha_ingreso, la aproximaremos a que de media todos llegarán 
    // a aportar X quincenas de las 23 posibles. Usaremos 23 como tope visual.
    const QUINCENAS_ANUALES = 23;
    const CUOTA_QUINCENAL = 10000;
    const META_OBJETIVO = personas.length * CUOTA_QUINCENAL * QUINCENAS_ANUALES;

    const porcentajeMeta = META_OBJETIVO > 0 ? Math.min((stats.total / META_OBJETIVO) * 100, 100).toFixed(1) : 0;

    // Lista de Pendientes (Deudores Críticos)
    const pendientesCriticos = [...personas]
        .filter(p => p.quincenas_pendientes > 0)
        .sort((a, b) => b.total_deuda - a.total_deuda)
        .slice(0, 4);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: 'var(--primary)' }}>
            <div className="animate-pulse">Cargando Dashboard de VDRSOFTWARE...</div>
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-1px' }}>Panel de Control</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>VDRSOFTWARE — Gestión de Recaudos e Indicadores</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-success" style={{ padding: '0.5rem 1rem' }}>Sistema Online</span>
                </div>
            </header>

            {/* Fila de Metas y Progreso */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card" style={{ background: 'linear-gradient(135deg, var(--surface) 0%, #1a1a1a 100%)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Proyección Anual 2026</h3>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                            {porcentajeMeta}%
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', height: '12px', borderRadius: '20px', overflow: 'hidden', marginBottom: '1rem' }}>
                            <div style={{ width: `${porcentajeMeta}%`, height: '100%', background: 'var(--primary)', boxShadow: '0 0 15px var(--primary)', transition: 'width 1s ease-out' }}></div>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Objetivo: <b>${META_OBJETIVO.toLocaleString()}</b> <span style={{ fontSize: '0.75rem' }}>({personas.length} miembros)</span>
                        </p>
                    </div>
                    <CheckCircle2 style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05, width: '120px', height: '120px' }} />
                </div>

                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', margin: 0 }}>
                    <StatCard label="Recaudado Total" value={`$${stats.total.toLocaleString()}`} icon={Wallet} color="16, 185, 129" />
                    <StatCard label="Total en Mora" value={`$${(stats.deudaTotal || 0).toLocaleString()}`} icon={AlertCircle} color="239, 68, 68" />
                    <StatCard label="Eficiencia Cobro" value={`${((stats.total / (stats.total + (stats.deudaTotal || 0))) * 100 || 0).toFixed(1)}%`} icon={ArrowUpRight} color="34, 211, 238" />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Gráfico Principal */}
                <div className="card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={20} color="var(--primary)" /> Histórico de Recaudos
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Actualizado cada 24h</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.porMes}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(val) => `$${val / 1000}k`} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ stroke: 'var(--primary)', strokeWidth: 2 }}
                                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', borderRadius: '12px', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}
                                    itemStyle={{ color: 'var(--primary)', fontWeight: 700 }}
                                />
                                <Area type="monotone" dataKey="total" stroke="var(--primary)" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={4} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Lista de Pendientes (To-Do de cobro) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card">
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Target size={20} color="var(--accent)" /> Distribución de Fondos
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            {metas.map(m => (
                                <div key={m.id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{m.nombre}</span>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>${(m.monto_disponible || 0).toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ flex: 1, height: '8px', background: 'var(--surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${m.porcentaje}%`, height: '100%', background: 'var(--accent)' }}></div>
                                        </div>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '35px' }}>{m.porcentaje}%</span>
                                    </div>
                                </div>
                            ))}
                            {metas.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay metas configuradas.</p>}
                        </div>
                    </div>

                    <div className="card" style={{ flex: 1 }}>
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.1rem' }}>
                            <Clock size={20} color="var(--warning)" /> Lista de Pendientes
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {pendientesCriticos.length > 0 ? pendientesCriticos.map(p => (
                                <div key={p.id} style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.nombre}</div>
                                        <div style={{ color: p.quincenas_pendientes > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                                            {p.quincenas_pendientes > 0 ? `-$${(p.total_deuda || 0).toLocaleString()}` : 'Al día'}
                                        </div>
                                        {p.penalizacion_sugerida > 0 && <span style={{ fontSize: '0.7em', color: 'var(--warning)' }}>+${p.penalizacion_sugerida} multa</span>}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 800, color: 'var(--text)' }}>${p.total_deuda.toLocaleString()}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Deuda Total</div>
                                    </div>
                                </div>
                            )) : (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    <CheckCircle2 size={40} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                                    <p>¡No hay deudores pendientes!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ background: 'var(--primary)', color: 'black' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Users size={32} strokeWidth={2.5} />
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>Comunidad Activa</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{personas.length} Miembros</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
