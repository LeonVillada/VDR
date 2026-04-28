import React, { useEffect, useState, useCallback } from 'react';
import { CalendarDays, Plus, X, Trash2, ArrowLeft, DollarSign, Users, TrendingUp, Receipt, ChevronRight, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { eventosApi, personasApi } from '../api';

const fmt = n => `$${Number(n||0).toLocaleString('es-CO')}`;
const ESTADO = {
    planificado: { color:'#3b82f6', bg:'#3b82f620', label:'Planificado', icon: Clock },
    en_curso:    { color:'#f59e0b', bg:'#f59e0b20', label:'En Curso',    icon: AlertCircle },
    finalizado:  { color:'#10b981', bg:'#10b98120', label:'Finalizado',  icon: CheckCircle2 },
    cancelado:   { color:'#ef4444', bg:'#ef444420', label:'Cancelado',   icon: XCircle },
};

const Badge = ({ estado }) => { const s = ESTADO[estado]||ESTADO.planificado; const I = s.icon; return <span style={{display:'inline-flex',alignItems:'center',gap:4,background:s.bg,color:s.color,padding:'0.2rem 0.6rem',borderRadius:8,fontSize:'0.8rem',fontWeight:700}}><I size={12}/> {s.label}</span>; };

const Stat = ({ label, value, color }) => (
    <div className="card" style={{padding:'1rem',borderTop:`3px solid ${color}`}}>
        <p style={{fontSize:'0.75rem',color:'var(--text-muted)',marginBottom:4}}>{label}</p>
        <p style={{fontSize:'1.2rem',fontWeight:800,color}}>{value}</p>
    </div>
);

/* ── MODAL CREAR EVENTO ── */
const ModalEvento = ({ onClose, onCreado }) => {
    const hoy = new Date().toISOString().split('T')[0];
    const [f, setF] = useState({ nombre:'', descripcion:'', fecha_evento:hoy, cuota_persona:'' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const h = e => setF({...f,[e.target.name]:e.target.value});
    const submit = async e => {
        e.preventDefault();
        if(!f.nombre||!f.fecha_evento){ setError('Completa los campos obligatorios.'); return; }
        setSaving(true); setError(null);
        try { await eventosApi.create({...f, cuota_persona:Number(f.cuota_persona||0)}); onCreado(); onClose(); }
        catch(err){ setError(err.response?.data?.error||'Error al crear evento.'); }
        finally{ setSaving(false); }
    };
    return (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',justifyContent:'center',alignItems:'center',padding:'1rem'}}>
            <div className="card" style={{width:'100%',maxWidth:500,padding:'2rem',position:'relative'}}>
                <button onClick={onClose} style={{position:'absolute',top:'1rem',right:'1rem',background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer'}}><X size={20}/></button>
                <h2 style={{display:'flex',alignItems:'center',gap:8,marginBottom:'1.5rem',fontSize:'1.3rem'}}><CalendarDays size={20} color="var(--primary)"/> Nuevo Evento</h2>
                {error && <div style={{background:'#ef444420',border:'1px solid #ef444460',borderRadius:8,padding:'0.75rem',marginBottom:'1rem',color:'#ef4444',fontSize:'0.9rem'}}>{error}</div>}
                <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
                    <div><label style={{fontSize:'0.85rem',color:'var(--text-muted)',display:'block',marginBottom:4}}>Nombre del Evento *</label><input name="nombre" value={f.nombre} onChange={h} className="input" required placeholder="Ej: Paseo fin de año"/></div>
                    <div><label style={{fontSize:'0.85rem',color:'var(--text-muted)',display:'block',marginBottom:4}}>Descripción</label><textarea name="descripcion" value={f.descripcion} onChange={h} className="input" rows={2} style={{resize:'vertical'}} placeholder="Detalles del evento..."/></div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                        <div><label style={{fontSize:'0.85rem',color:'var(--text-muted)',display:'block',marginBottom:4}}>Fecha del Evento *</label><input name="fecha_evento" type="date" value={f.fecha_evento} onChange={h} className="input" required/></div>
                        <div><label style={{fontSize:'0.85rem',color:'var(--text-muted)',display:'block',marginBottom:4}}>Cuota por Persona ($)</label><input name="cuota_persona" type="number" min="0" step="100" value={f.cuota_persona} onChange={h} className="input" placeholder="0"/></div>
                    </div>
                    <div style={{display:'flex',gap:'0.75rem',marginTop:8}}>
                        <button type="button" onClick={onClose} className="btn btn-ghost" style={{flex:1}}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" style={{flex:2}} disabled={saving}>{saving?'Guardando...':'Crear Evento'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ── DETALLE EVENTO ── */
const DetalleEvento = ({ eventoId, onVolver, onAct, personas }) => {
    const [det, setDet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('recaudos');
    const [showFormR, setShowFormR] = useState(false);
    const [showFormG, setShowFormG] = useState(false);
    const [showEstado, setShowEstado] = useState(false);
    const hoy = new Date().toISOString().split('T')[0];
    const [fR, setFR] = useState({ persona:'', monto:'', fecha_pago:hoy, notas:'' });
    const [fG, setFG] = useState({ concepto:'', monto:'', fecha_gasto:hoy, notas:'' });

    const cargar = useCallback(async()=>{ setLoading(true); try{ const r=await eventosApi.getById(eventoId); setDet(r.data); }catch{setDet(null);} finally{setLoading(false);} },[eventoId]);
    useEffect(()=>{cargar();},[cargar]);

    const addRecaudo = async e => { e.preventDefault(); await eventosApi.registrarRecaudo(eventoId, {...fR,monto:Number(fR.monto)}); setFR({persona:'',monto:'',fecha_pago:hoy,notas:''}); setShowFormR(false); cargar(); onAct(); };
    const addGasto = async e => { e.preventDefault(); await eventosApi.registrarGasto(eventoId, {...fG,monto:Number(fG.monto)}); setFG({concepto:'',monto:'',fecha_gasto:hoy,notas:''}); setShowFormG(false); cargar(); onAct(); };
    const delRecaudo = async id => { if(!window.confirm('¿Eliminar este recaudo?'))return; await eventosApi.eliminarRecaudo(id); cargar(); onAct(); };
    const delGasto = async id => { if(!window.confirm('¿Eliminar este gasto?'))return; await eventosApi.eliminarGasto(id); cargar(); onAct(); };
    const cambiarEstado = async est => { await eventosApi.update(eventoId, {...det, estado:est, recaudos:undefined, gastos:undefined}); setShowEstado(false); cargar(); onAct(); };

    const [modoRecaudo, setModoRecaudo] = useState('individual');
    const [masivo, setMasivo] = useState([]);
    const [savingMasivo, setSavingMasivo] = useState(false);

    useEffect(() => {
        if(personas.length > 0 && det) {
            setMasivo(personas.map(p => ({ persona: p.nombre, monto: det.cuota_persona || '', checked: false })));
        }
    }, [personas, det]);

    const toggleAll = (val) => setMasivo(masivo.map(m => ({...m, checked: val})));
    const toggleOne = (i) => { const n=[...masivo]; n[i].checked=!n[i].checked; setMasivo(n); };
    const setMontoMasivo = (i,v) => { const n=[...masivo]; n[i].monto=v; setMasivo(n); };
    const setMontoTodos = (v) => setMasivo(masivo.map(m => ({...m, monto: v})));

    const submitMasivo = async () => {
        const seleccionados = masivo.filter(m => m.checked && Number(m.monto) > 0);
        if(seleccionados.length === 0) return;
        setSavingMasivo(true);
        try {
            await eventosApi.registrarRecaudosMasivo(eventoId, {
                recaudos: seleccionados.map(m => ({ persona: m.persona, monto: Number(m.monto), fecha_pago: hoy, notas: '' }))
            });
            cargar(); onAct();
            setMasivo(masivo.map(m => ({...m, checked: false})));
        } catch(err) { console.error(err); }
        finally { setSavingMasivo(false); }
    };

    if(loading) return <div style={{textAlign:'center',padding:'4rem',color:'var(--text-muted)'}}>Cargando...</div>;
    if(!det) return <div style={{textAlign:'center',padding:'4rem',color:'var(--danger)'}}>Evento no encontrado.</div>;

    const est = ESTADO[det.estado]||ESTADO.planificado;
    const pct = det.total_recaudado > 0 && det.total_gastado > 0 ? Math.min((det.total_gastado/det.total_recaudado)*100,100) : 0;
    const checkedCount = masivo.filter(m=>m.checked).length;
    const totalMasivo = masivo.filter(m=>m.checked).reduce((s,m)=>s+Number(m.monto||0),0);

    return (
        <div className="animate-fade-in">
            <button onClick={onVolver} className="btn btn-ghost" style={{marginBottom:'1.5rem',gap:6,color:'var(--text-muted)'}}><ArrowLeft size={16}/> Volver a eventos</button>

            <div className="card" style={{padding:'2rem',marginBottom:'1.5rem',borderLeft:`4px solid ${est.color}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'1rem'}}>
                    <div>
                        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6}}><h2 style={{fontSize:'1.5rem',fontWeight:800,margin:0}}>{det.nombre}</h2><Badge estado={det.estado}/></div>
                        <p style={{fontSize:'0.85rem',color:'var(--text-muted)'}}><CalendarDays size={13} style={{verticalAlign:'middle',marginRight:4}}/>Fecha: <b style={{color:'var(--text)'}}>{det.fecha_evento?.split('T')[0]}</b> {det.cuota_persona>0 && <> — Cuota: <b style={{color:'var(--primary)'}}>{fmt(det.cuota_persona)}</b></>}</p>
                        {det.descripcion && <p style={{marginTop:6,fontSize:'0.85rem',color:'var(--text-muted)',fontStyle:'italic'}}>{det.descripcion}</p>}
                    </div>
                    <div style={{display:'flex',gap:8}}>
                        <button onClick={()=>setShowEstado(!showEstado)} className="btn btn-ghost" style={{fontSize:'0.8rem'}}>Cambiar Estado</button>
                    </div>
                </div>
                {showEstado && <div style={{display:'flex',gap:8,marginTop:'1rem',flexWrap:'wrap'}}>{Object.entries(ESTADO).map(([k,v])=>(<button key={k} onClick={()=>cambiarEstado(k)} className="btn btn-ghost" style={{fontSize:'0.8rem',borderColor:v.color,color:v.color,padding:'0.3rem 0.75rem'}}>{v.label}</button>))}</div>}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'1rem',marginBottom:'1.5rem'}}>
                <Stat label="Total Recaudado" value={fmt(det.total_recaudado)} color="#10b981"/>
                <Stat label="Total Gastado" value={fmt(det.total_gastado)} color="#ef4444"/>
                <Stat label="Balance" value={fmt(det.balance)} color={det.balance>=0?'#10b981':'#ef4444'}/>
                <Stat label="Cuota/Persona" value={fmt(det.cuota_persona)} color="#6366f1"/>
            </div>

            {det.total_recaudado>0 && <div className="card" style={{padding:'1.25rem',marginBottom:'1.5rem'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:'0.85rem'}}><span style={{color:'var(--text-muted)'}}>Uso del recaudo</span><span style={{fontWeight:700,color:pct>=100?'var(--danger)':'var(--primary)'}}>{pct.toFixed(1)}%</span></div>
                <div style={{background:'rgba(255,255,255,0.05)',height:12,borderRadius:20,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',borderRadius:20,background:pct>=100?'var(--danger)':'var(--primary)',transition:'width 1s ease-out'}}/></div>
            </div>}

            <div style={{display:'flex',gap:8,marginBottom:'1.5rem'}}>
                <button onClick={()=>setTab('recaudos')} className={`btn ${tab==='recaudos'?'btn-primary':'btn-ghost'}`} style={{fontSize:'0.85rem'}}>
                    <DollarSign size={16}/> Recaudos ({det.recaudos?.length||0})
                </button>
                <button onClick={()=>setTab('gastos')} className={`btn ${tab==='gastos'?'btn-primary':'btn-ghost'}`} style={{fontSize:'0.85rem'}}>
                    <Receipt size={16}/> Gastos ({det.gastos?.length||0})
                </button>
            </div>

            {tab==='recaudos' && (
                <div className="card" style={{padding:'2rem'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem',flexWrap:'wrap',gap:8}}>
                        <h3 style={{display:'flex',alignItems:'center',gap:8,margin:0}}><DollarSign size={16} color="#10b981"/> Recaudos</h3>
                        <div style={{display:'flex',gap:6}}>
                            <button onClick={()=>{setModoRecaudo('masivo');setShowFormR(false);}} className={`btn ${modoRecaudo==='masivo'?'btn-primary':'btn-ghost'}`} style={{fontSize:'0.8rem'}}><Users size={14}/> Masivo</button>
                            <button onClick={()=>{setModoRecaudo('individual');setShowFormR(!showFormR);}} className={`btn ${modoRecaudo==='individual'&&showFormR?'btn-primary':'btn-ghost'}`} style={{fontSize:'0.8rem'}}><Plus size={14}/> Individual</button>
                        </div>
                    </div>

                    {/* FORM INDIVIDUAL */}
                    {modoRecaudo==='individual' && showFormR && (
                        <form onSubmit={addRecaudo} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'1.5rem',padding:'1rem',background:'rgba(16,185,129,0.05)',borderRadius:12,border:'1px solid rgba(16,185,129,0.2)'}}>
                            <select name="persona" value={fR.persona} onChange={e=>setFR({...fR,persona:e.target.value})} className="input" required><option value="">Seleccionar persona...</option>{personas.map(p=><option key={p.id} value={p.nombre}>{p.nombre}</option>)}</select>
                            <input name="monto" type="number" min="0" step="100" placeholder="Monto" value={fR.monto} onChange={e=>setFR({...fR,monto:e.target.value})} className="input" required/>
                            <input name="fecha_pago" type="date" value={fR.fecha_pago} onChange={e=>setFR({...fR,fecha_pago:e.target.value})} className="input" required/>
                            <input name="notas" placeholder="Notas (opcional)" value={fR.notas} onChange={e=>setFR({...fR,notas:e.target.value})} className="input"/>
                            <button type="submit" className="btn btn-primary" style={{gridColumn:'1/-1'}}>Registrar Recaudo</button>
                        </form>
                    )}

                    {/* FORM MASIVO */}
                    {modoRecaudo==='masivo' && (
                        <div style={{marginBottom:'1.5rem',padding:'1.25rem',background:'rgba(99,102,241,0.05)',borderRadius:12,border:'1px solid rgba(99,102,241,0.2)'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',flexWrap:'wrap',gap:8}}>
                                <p style={{margin:0,fontSize:'0.85rem',color:'var(--text-muted)',fontWeight:600}}>Selecciona integrantes y asigna montos</p>
                                <div style={{display:'flex',gap:6}}>
                                    <button type="button" onClick={()=>toggleAll(true)} className="btn btn-ghost" style={{fontSize:'0.75rem',padding:'0.25rem 0.6rem'}}>✓ Todos</button>
                                    <button type="button" onClick={()=>toggleAll(false)} className="btn btn-ghost" style={{fontSize:'0.75rem',padding:'0.25rem 0.6rem'}}>✗ Ninguno</button>
                                    {det.cuota_persona>0 && <button type="button" onClick={()=>setMontoTodos(det.cuota_persona)} className="btn btn-ghost" style={{fontSize:'0.75rem',padding:'0.25rem 0.6rem',color:'#6366f1'}}>Aplicar cuota ({fmt(det.cuota_persona)})</button>}
                                </div>
                            </div>
                            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:8,maxHeight:400,overflowY:'auto',paddingRight:4}}>
                                {masivo.map((m,i) => {
                                    const yaPago = det.recaudos?.some(r=>r.persona===m.persona);
                                    return (
                                        <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'0.6rem 0.75rem',borderRadius:10,background: m.checked?'rgba(16,185,129,0.1)':'rgba(255,255,255,0.02)',border:`1px solid ${m.checked?'rgba(16,185,129,0.3)':'rgba(255,255,255,0.05)'}`,transition:'all 0.2s',opacity:yaPago?0.5:1}}>
                                            <input type="checkbox" checked={m.checked} onChange={()=>toggleOne(i)} style={{width:18,height:18,accentColor:'#10b981',cursor:'pointer'}}/>
                                            <span style={{flex:1,fontWeight:600,fontSize:'0.85rem'}}>{m.persona} {yaPago && <span style={{fontSize:'0.7rem',color:'#10b981'}}>✓ ya pagó</span>}</span>
                                            <input type="number" min="0" step="100" value={m.monto} onChange={e=>setMontoMasivo(i,e.target.value)} className="input" style={{width:110,padding:'0.3rem 0.5rem',fontSize:'0.85rem',textAlign:'right'}} placeholder="$0"/>
                                        </div>
                                    );
                                })}
                            </div>
                            {checkedCount>0 && (
                                <div style={{marginTop:'1rem',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.75rem 1rem',background:'rgba(16,185,129,0.08)',borderRadius:10}}>
                                    <span style={{fontSize:'0.85rem',color:'var(--text-muted)'}}><b style={{color:'var(--text)'}}>{checkedCount}</b> seleccionados — Total: <b style={{color:'#10b981'}}>{fmt(totalMasivo)}</b></span>
                                    <button onClick={submitMasivo} className="btn btn-primary" style={{fontSize:'0.85rem'}} disabled={savingMasivo}>{savingMasivo?'Registrando...':'Registrar Todos'}</button>
                                </div>
                            )}
                        </div>
                    )}

                    {det.recaudos?.length>0 ? det.recaudos.map(r=>(
                        <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.875rem 1rem',borderRadius:12,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',marginBottom:8}}>
                            <div><div style={{fontWeight:600,fontSize:'0.9rem'}}>{r.persona} <span style={{color:'#10b981',fontWeight:800}}>{fmt(r.monto)}</span></div><div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{r.fecha_pago?.split('T')[0]}{r.notas&&` — ${r.notas}`}</div></div>
                            <button onClick={()=>delRecaudo(r.id)} className="btn btn-ghost" style={{padding:4,color:'var(--danger)',opacity:0.6}}><Trash2 size={14}/></button>
                        </div>
                    )) : <div style={{textAlign:'center',padding:'2rem',color:'var(--text-muted)'}}><Users size={36} style={{margin:'0 auto 0.75rem',opacity:0.2}}/><p style={{fontSize:'0.9rem'}}>Sin recaudos registrados.</p></div>}
                </div>
            )}

            {tab==='gastos' && (
                <div className="card" style={{padding:'2rem'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
                        <h3 style={{display:'flex',alignItems:'center',gap:8,margin:0}}><Receipt size={16} color="#ef4444"/> Gastos del Evento</h3>
                        <button onClick={()=>setShowFormG(!showFormG)} className="btn btn-primary" style={{fontSize:'0.85rem'}}><Plus size={14}/> Agregar</button>
                    </div>
                    {showFormG && (
                        <form onSubmit={addGasto} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'1.5rem',padding:'1rem',background:'rgba(239,68,68,0.05)',borderRadius:12,border:'1px solid rgba(239,68,68,0.2)'}}>
                            <input name="concepto" placeholder="Concepto del gasto" value={fG.concepto} onChange={e=>setFG({...fG,concepto:e.target.value})} className="input" required/>
                            <input name="monto" type="number" min="0" step="100" placeholder="Monto" value={fG.monto} onChange={e=>setFG({...fG,monto:e.target.value})} className="input" required/>
                            <input name="fecha_gasto" type="date" value={fG.fecha_gasto} onChange={e=>setFG({...fG,fecha_gasto:e.target.value})} className="input" required/>
                            <input name="notas" placeholder="Notas (opcional)" value={fG.notas} onChange={e=>setFG({...fG,notas:e.target.value})} className="input"/>
                            <button type="submit" className="btn btn-primary" style={{gridColumn:'1/-1'}}>Registrar Gasto</button>
                        </form>
                    )}
                    {det.gastos?.length>0 ? det.gastos.map(g=>(
                        <div key={g.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.875rem 1rem',borderRadius:12,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',marginBottom:8}}>
                            <div><div style={{fontWeight:600,fontSize:'0.9rem'}}>{g.concepto} <span style={{color:'#ef4444',fontWeight:800}}>-{fmt(g.monto)}</span></div><div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{g.fecha_gasto?.split('T')[0]}{g.notas&&` — ${g.notas}`}</div></div>
                            <button onClick={()=>delGasto(g.id)} className="btn btn-ghost" style={{padding:4,color:'var(--danger)',opacity:0.6}}><Trash2 size={14}/></button>
                        </div>
                    )) : <div style={{textAlign:'center',padding:'2rem',color:'var(--text-muted)'}}><Receipt size={36} style={{margin:'0 auto 0.75rem',opacity:0.2}}/><p style={{fontSize:'0.9rem'}}>Sin gastos registrados.</p></div>}
                </div>
            )}
        </div>
    );
};

/* ── PÁGINA PRINCIPAL ── */
const Eventos = () => {
    const [eventos, setEventos] = useState([]);
    const [stats, setStats] = useState(null);
    const [personas, setPersonas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [detalleId, setDetalleId] = useState(null);
    const [filtro, setFiltro] = useState('todos');

    const cargar = useCallback(async()=>{
        setLoading(true);
        try{
            const [eR,sR,pR]=await Promise.all([eventosApi.getAll(),eventosApi.getStats(),personasApi.getAll()]);
            setEventos(eR.data); setStats(sR.data); setPersonas(pR.data.sort((a,b)=>a.nombre.localeCompare(b.nombre)));
        }catch(err){console.error(err);} finally{setLoading(false);}
    },[]);
    useEffect(()=>{cargar();},[cargar]);

    const eliminar = async(id,e)=>{ e.stopPropagation(); if(!window.confirm('¿Eliminar este evento y todos sus registros?'))return; await eventosApi.delete(id); cargar(); };
    const lista = eventos.filter(e=> filtro==='todos'||e.estado===filtro);

    if(detalleId) return <DetalleEvento eventoId={detalleId} onVolver={()=>setDetalleId(null)} onAct={cargar} personas={personas}/>;

    return (
        <div className="animate-fade-in" style={{paddingBottom:'3rem'}}>
            <header style={{marginBottom:'2rem',display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                <div>
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
                        <div style={{background:'#f59e0b',padding:'0.6rem',borderRadius:12,display:'flex'}}><CalendarDays color="white" size={22} strokeWidth={2.5}/></div>
                        <h1 style={{fontSize:'2rem',fontWeight:800,letterSpacing:'-1px',margin:0}}>Eventos</h1>
                    </div>
                    <p style={{color:'var(--text-muted)'}}>Seguimiento de eventos esporádicos — recaudos y gastos</p>
                </div>
                <button onClick={()=>setShowModal(true)} className="btn btn-primary" style={{gap:6}}><Plus size={18}/> Nuevo Evento</button>
            </header>

            {stats && (
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'1rem',marginBottom:'1.5rem'}}>
                    <Stat label="Total Eventos" value={stats.total_eventos} color="#3b82f6"/>
                    <Stat label="En Curso" value={stats.en_curso} color="#f59e0b"/>
                    <Stat label="Total Recaudado" value={fmt(stats.total_recaudado_global)} color="#10b981"/>
                    <Stat label="Total Gastado" value={fmt(stats.total_gastado_global)} color="#ef4444"/>
                    <Stat label="Balance Global" value={fmt(stats.balance_global)} color={stats.balance_global>=0?'#10b981':'#ef4444'}/>
                </div>
            )}

            <div className="card" style={{padding:'1.25rem',marginBottom:'1.5rem',display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
                {['todos','planificado','en_curso','finalizado','cancelado'].map(f=>(
                    <button key={f} onClick={()=>setFiltro(f)} className={`btn ${filtro===f?'btn-primary':'btn-ghost'}`} style={{fontSize:'0.8rem',padding:'0.4rem 0.8rem',...(f!=='todos'&&{color:ESTADO[f]?.color})}}>
                        {f==='todos'?'Todos':ESTADO[f]?.label}
                    </button>
                ))}
            </div>

            {loading ? <div style={{textAlign:'center',padding:'4rem',color:'var(--text-muted)'}}>Cargando eventos...</div>
            : lista.length===0 ? (
                <div className="card" style={{textAlign:'center',padding:'4rem'}}><CalendarDays size={48} style={{margin:'0 auto 1rem',opacity:0.15}}/><p style={{color:'var(--text-muted)'}}>{eventos.length===0?'No hay eventos registrados.':'No hay eventos con ese filtro.'}</p></div>
            ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                    {lista.map(ev=>{
                        const est=ESTADO[ev.estado]||ESTADO.planificado;
                        return (
                            <div key={ev.id} onClick={()=>setDetalleId(ev.id)} className="card" style={{padding:'1.25rem 1.5rem',cursor:'pointer',borderLeft:`4px solid ${est.color}`,transition:'transform 0.15s'}} onMouseEnter={e=>e.currentTarget.style.transform='translateX(4px)'} onMouseLeave={e=>e.currentTarget.style.transform='translateX(0)'}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'0.75rem'}}>
                                    <div style={{flex:1,minWidth:200}}>
                                        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                                            <div style={{width:32,height:32,borderRadius:'50%',background:`${est.color}20`,display:'flex',alignItems:'center',justifyContent:'center'}}><CalendarDays size={16} color={est.color}/></div>
                                            <span style={{fontWeight:700,fontSize:'1rem'}}>{ev.nombre}</span>
                                            <Badge estado={ev.estado}/>
                                        </div>
                                        <div style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>Fecha: {ev.fecha_evento?.split('T')[0]} {ev.cuota_persona>0&&`— Cuota: ${fmt(ev.cuota_persona)}`}</div>
                                    </div>
                                    <div style={{textAlign:'right',display:'flex',flexDirection:'column',gap:2,alignItems:'flex-end'}}>
                                        <div style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>Recaudado: <b style={{color:'#10b981'}}>{fmt(ev.total_recaudado)}</b></div>
                                        <div style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>Gastado: <b style={{color:'#ef4444'}}>{fmt(ev.total_gastado)}</b></div>
                                        <div style={{fontSize:'0.9rem',fontWeight:700,color:ev.balance>=0?'#10b981':'#ef4444'}}>Balance: {fmt(ev.balance)}</div>
                                    </div>
                                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                                        <button onClick={e=>eliminar(ev.id,e)} className="btn btn-ghost" style={{padding:4,color:'var(--danger)',opacity:0.5}} title="Eliminar"><Trash2 size={14}/></button>
                                        <ChevronRight size={16} color="var(--text-muted)"/>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {showModal && <ModalEvento onClose={()=>setShowModal(false)} onCreado={cargar}/>}
        </div>
    );
};

export default Eventos;
