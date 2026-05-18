import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
    Wallet, Users, AlertCircle, TrendingUp, CheckCircle2, Clock, 
    ArrowUpRight, PieChart as PieIcon, Target, Landmark, ArrowDownCircle, ArrowUpCircle,
    FileText, Download, UserMinus, History, Banknote
} from 'lucide-react';
import { bancoApi, personasApi } from '../api';
import { Link } from 'react-router-dom';
import { generateMasterPDF } from '../reportes/ReporteMaster';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-CO')}`;

const FundPanel = ({ title, total, usage, expenses, final, icon: Icon, color, children }) => (
    <div className="card" style={{ borderTop: `4px solid ${color}`, height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Icon size={20} color={color} /> {title}
            </h3>
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px', background: `${color}15`, color: color, fontWeight: 700 }}>
                Analítica de Fondo
            </span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Recaudo Histórico</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{fmt(total)}</p>
            </div>
            <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Disponible en Caja</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: color }}>{fmt(final)}</p>
            </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Utilización del Fondo (Préstamos + Gastos)</span>
                <span style={{ fontWeight: 700 }}>{(((usage + expenses) / total) * 100).toFixed(1)}%</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${((usage + expenses) / total) * 100}%`, height: '100%', background: color, boxShadow: `0 0 10px ${color}40` }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>{fmt(usage)} en préstamos</span>
                <span>{fmt(expenses)} en gastos</span>
            </div>
        </div>

        {children}
    </div>
);

const Dashboard = () => {
    const [bancoData, setBancoData] = useState(null);
    const [masterData, setMasterData] = useState(null);
    const [personas, setPersonas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const FUND_COLORS = {
        cuotas: '#3b82f6',
        alcantarilla: '#10b981',
        ganancias: '#f59e0b'
    };

    const fetchData = async () => {
        try {
            const [bancoRes, personasRes, masterRes] = await Promise.all([
                bancoApi.getFondoGlobal(),
                personasApi.getAll(),
                bancoApi.getResumenMaestro()
            ]);
            setBancoData(bancoRes.data);
            setPersonas(personasRes.data);
            setMasterData(masterRes.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleDownloadReport = async () => {
        if (!masterData) return;
        setGenerating(true);
        try {
            generateMasterPDF(masterData, bancoData);
        } catch (err) { console.error(err); alert('Error al generar el reporte'); }
        finally { setGenerating(false); }
    };

    if (loading || !bancoData || !masterData) return <div style={{ textAlign: 'center', padding: '10rem', color: 'var(--primary)' }}>Cargando inteligencia financiera...</div>;

    const patrimonioTotal = bancoData.fondo_patrimonial;
    const efectivoCaja = bancoData.fondo_total;
    const capitalCalle = bancoData.capital_prestado_activo;

    // Cálculo unificado de deuda (Cuotas + Alcantarilla)
    const deudaCuotas = masterData.deudores_cuotas.reduce((s, d) => s + Number(d.monto_deuda), 0);
    const deudaAlcantarilla = masterData.deudores_alcantarilla.reduce((s, a) => s + a.deudores.reduce((ss, dd) => ss + dd.deuda_pesos, 0), 0);
    const deudaTotalUnificada = deudaCuotas + deudaAlcantarilla;

    const numDeudoresTotal = new Set([
        ...masterData.deudores_cuotas.map(d => d.nombre),
        ...masterData.deudores_alcantarilla.flatMap(a => a.deudores.map(d => d.nombre))
    ]).size;

    // Gastos acumulados por fondo
    const gastoCuotas = masterData.gastos.filter(g => g.fondo_id === 1).reduce((s, g) => s + Number(g.precio), 0);
    const gastoAlcantarilla = masterData.gastos.filter(g => g.fondo_id === 2).reduce((s, g) => s + Number(g.precio), 0);
    const gastoGanancias = masterData.gastos.filter(g => g.fondo_id === 3).reduce((s, g) => s + Number(g.precio), 0);

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: '0.25rem' }}>
                        Dashboard VDR <span style={{ color: 'var(--primary)', fontWeight: 300 }}>Pro</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Análisis profundo de flujos, deudores y patrimonio por fondo</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        onClick={handleDownloadReport}
                        className="btn btn-primary" 
                        style={{ gap: '0.6rem', padding: '0.8rem 1.5rem' }}
                        disabled={generating}
                    >
                        {generating ? <Clock className="animate-spin" size={18} /> : <Download size={18} />} 
                        {generating ? 'Generando...' : 'Reporte Maestro PDF'}
                    </button>
                </div>
            </header>

            {/* Resumen Patrimonial */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div className="card" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Patrimonio Neto Total</span>
                        <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '0.5rem', borderRadius: '10px' }}><Landmark size={20} /></div>
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>{fmt(patrimonioTotal)}</div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                        <span style={{ color: '#3b82f6' }}>● {fmt(efectivoCaja)} Líquido</span>
                        <span style={{ color: '#f59e0b' }}>● {fmt(capitalCalle)} Préstamos</span>
                    </div>
                </div>

                <div className="card" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Composición de Fondos</h4>
                    <div style={{ height: '140px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={[
                                        { name: 'Cuotas', value: bancoData.fuentes.cuotas, fill: FUND_COLORS.cuotas },
                                        { name: 'Alcantarilla', value: Math.max(0, bancoData.fuentes.alcantarilla), fill: FUND_COLORS.alcantarilla },
                                        { name: 'Ganancias', value: bancoData.fuentes.intereses_prestamos, fill: FUND_COLORS.ganancias }
                                    ]} 
                                    innerRadius={45} 
                                    outerRadius={65} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                >
                                    {[0,1,2].map((i) => <Cell key={i} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.1)', background: 'rgba(239,68,68,0.02)' }}>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '1.5rem', fontWeight: 700 }}>Alerta de Deuda Unificada</h4>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)' }}>{fmt(deudaTotalUnificada)}</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        {numDeudoresTotal} integrantes con compromisos pendientes (Cuotas + Boletas).
                    </p>
                </div>
            </div>

            {/* SECCIONES POR FONDO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                
                {/* FONDO CUOTAS */}
                <FundPanel 
                    title="Fondo Cuotas Quincenales" 
                    total={masterData.totales_historicos.cuotas} 
                    usage={capitalCalle} 
                    expenses={gastoCuotas} 
                    final={bancoData.fuentes.cuotas}
                    icon={Users}
                    color={FUND_COLORS.cuotas}
                >
                    <div style={{ marginTop: '1rem' }}>
                        <h5 style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.8rem', opacity: 0.8, color: 'var(--danger)' }}>DEUDORES DE CUOTAS</h5>
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {masterData.deudores_cuotas.length === 0 ? <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Al día</p> : 
                             masterData.deudores_cuotas.map(d => (
                                <div key={d.nombre} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.8rem', borderLeft: '3px solid var(--danger)' }}>
                                    <span>{d.nombre}</span>
                                    <span style={{ fontWeight: 700 }}>{fmt(d.monto_deuda)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div style={{ marginTop: '1rem', padding: '0.6rem', background: 'rgba(220, 38, 38, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--danger)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                <span style={{ color: 'var(--danger)', fontWeight: 700 }}>PENALIZACIONES COBRADAS</span>
                                <span style={{ fontWeight: 800, color: 'var(--danger)' }}>{fmt(bancoData.fuentes.penalizaciones_total)}</span>
                            </div>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Recaudo por multas de mora (incluido en caja)</p>
                        </div>
                        <div style={{ borderTop: '1px solid rgba(220, 38, 38, 0.15)', paddingTop: '0.4rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                <span style={{ color: 'var(--warning)', fontWeight: 700 }}>PENALIZACIONES POR COBRAR</span>
                                <span style={{ fontWeight: 800, color: 'var(--warning)' }}>{fmt(bancoData.fuentes.penalizaciones_pendientes_monto)}</span>
                            </div>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Total de multas activas por cobrar ({bancoData.fuentes.penalizaciones_pendientes_count} integrantes)</p>
                        </div>
                    </div>
                </FundPanel>

                {/* FONDO ALCANTARILLA */}
                <FundPanel 
                    title="La Alcantarilla" 
                    total={masterData.totales_historicos.alcantarilla} 
                    usage={masterData.totales_historicos.alcantarilla_premios} 
                    expenses={gastoAlcantarilla} 
                    final={bancoData.fuentes.alcantarilla}
                    icon={Target}
                    color={FUND_COLORS.alcantarilla}
                >
                    <div style={{ marginTop: '0.5rem', marginBottom: '1rem', display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                        <div style={{ flex: 1, padding: '0.6rem', background: 'rgba(16,185,129,0.05)', borderRadius: '10px', textAlign: 'center' }}>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem' }}>Premios</span>
                            <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{fmt(masterData.totales_historicos.alcantarilla_premios)}</span>
                        </div>
                        <div style={{ flex: 1, padding: '0.6rem', background: 'rgba(16,185,129,0.05)', borderRadius: '10px', textAlign: 'center' }}>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem' }}>Recaudado Neto</span>
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(masterData.totales_historicos.alcantarilla - masterData.totales_historicos.alcantarilla_premios)}</span>
                        </div>
                    </div>
                    <div>
                        <h5 style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.8rem', opacity: 0.8 }}>DEUDORES DE BOLETAS</h5>
                        <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {masterData.deudores_alcantarilla.flatMap(a => a.deudores).length === 0 ? <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sin deudas</p> :
                             masterData.deudores_alcantarilla.flatMap(a => a.deudores).map((d, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.8rem', borderLeft: '3px solid var(--warning)' }}>
                                    <span>{d.nombre}</span>
                                    <span>{d.faltantes} b. ({fmt(d.deuda_pesos)})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </FundPanel>

                {/* FONDO GANANCIAS */}
                <FundPanel 
                    title="Intereses y Ganancias" 
                    total={masterData.totales_historicos.ganancias} 
                    usage={0} 
                    expenses={gastoGanancias} 
                    final={bancoData.fuentes.intereses_prestamos}
                    icon={TrendingUp}
                    color={FUND_COLORS.ganancias}
                >
                    <div style={{ marginTop: '1rem' }}>
                        <h5 style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.8rem', opacity: 0.8, color: 'var(--accent)' }}>PRÉSTAMOS GENERANDO RENDIMIENTO</h5>
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {masterData.prestamos_activos.length === 0 ? <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sin préstamos activos</p> :
                             masterData.prestamos_activos.map(p => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.8rem', borderLeft: '3px solid var(--accent)' }}>
                                    <span>{p.responsable}</span>
                                    <span style={{ fontWeight: 600 }}>C: {fmt(p.saldo_pendiente)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </FundPanel>

            </div>

            {/* EVOLUCIÓN GLOBAL */}
            <div className="card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <History size={20} color="var(--primary)" /> Reconstrucción Histórica del Capital
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                        <span style={{ color: FUND_COLORS.cuotas }}>● Cuotas</span>
                        <span style={{ color: FUND_COLORS.alcantarilla }}>● Alcantarilla</span>
                        <span style={{ color: FUND_COLORS.ganancias }}>● Ganancias</span>
                    </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
                    <div style={{ height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={bancoData.historico_fondos}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="mes" fontSize={12} axisLine={false} tickLine={false} />
                                <YAxis fontSize={12} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px' }} />
                                <Area type="monotone" dataKey="cuotas" stroke={FUND_COLORS.cuotas} fill="transparent" strokeWidth={3} />
                                <Area type="monotone" dataKey="alcantarilla" stroke={FUND_COLORS.alcantarilla} fill="transparent" strokeWidth={3} />
                                <Area type="monotone" dataKey="ganancias" stroke={FUND_COLORS.ganancias} fill="transparent" strokeWidth={3} />
                                <Area type="monotone" dataKey="total" stroke="var(--primary)" fill="url(#colorTotal)" strokeWidth={4} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.2rem', opacity: 0.8 }}>ÚLTIMOS GASTOS / SALIDAS</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {masterData.gastos.slice(0, 5).map(g => (
                                <div key={g.id} style={{ fontSize: '0.8rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                        <span>{g.evento}</span>
                                        <span style={{ color: 'var(--danger)' }}>-{fmt(g.precio)}</span>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {new Date(g.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                            <Link to="/gastos" style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, marginTop: '0.5rem', textDecoration: 'none' }}>
                                VER TODO EL HISTORIAL →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
