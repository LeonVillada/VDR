import React, { useEffect, useState } from 'react';
import { gastosApi, fondosApi } from '../api';
import { 
    CheckCircle2, Trash2, PlusCircle, Receipt, Upload, Save, 
    AlertCircle, FileText, Image as ImageIcon, Search, Filter 
} from 'lucide-react';

const Gastos = () => {
    const [gastos, setGastos] = useState([]);
    const [fondos, setFondos] = useState([]);
    const [nuevoGasto, setNuevoGasto] = useState({ 
        evento: '', 
        precio: '', 
        fondo_id: '', 
        observaciones: '', 
        sin_factura: false 
    });
    const [facturas, setFacturas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
    const [filtro, setFiltro] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [gastosRes, fondosRes] = await Promise.all([
                    gastosApi.getAll(),
                    fondosApi.getAll()
                ]);
                setGastos(gastosRes);
                setFondos(fondosRes);
                if (fondosRes.length > 0) {
                    setNuevoGasto(prev => ({ ...prev, fondo_id: fondosRes[0].id }));
                }
            } catch (error) {
                console.error('Error al cargar datos:', error);
                setMensaje({ tipo: 'danger', texto: 'Error al conectar con el servidor.' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNuevoGasto({ 
            ...nuevoGasto, 
            [name]: type === 'checkbox' ? checked : value 
        });
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setFacturas([...facturas, ...files]);
    };

    const removeFile = (index) => {
        setFacturas(facturas.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMensaje({ tipo: '', texto: '' });

        try {
            // 1. Crear el gasto base
            const data = await gastosApi.create(nuevoGasto);

            // 2. Subir facturas si existen
            if (facturas.length > 0 && !nuevoGasto.sin_factura) {
                const formData = new FormData();
                facturas.forEach((archivo) => {
                    formData.append('factura', archivo);
                });
                formData.append('gastoId', data.id);
                
                const response = await fetch(`http://${window.location.hostname}:2014/api/gastos/factura`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) throw new Error('Error al subir facturas');
            }

            // Recargar lista
            const updatedGastos = await gastosApi.getAll();
            setGastos(updatedGastos);

            setMensaje({ tipo: 'success', texto: '¡Gasto registrado exitosamente!' });
            setNuevoGasto({ 
                evento: '', 
                precio: '', 
                fondo_id: fondos[0]?.id || '', 
                observaciones: '', 
                sin_factura: false 
            });
            setFacturas([]);
        } catch (error) {
            console.error(error);
            setMensaje({ tipo: 'danger', texto: 'Error al procesar el gasto.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este gasto?')) return;
        try {
            await gastosApi.delete(id);
            setGastos(gastos.filter(g => g.id !== id));
        } catch (error) {
            console.error('Error al eliminar el gasto:', error);
        }
    };

    const gastosFiltrados = gastos.filter(g => 
        g.evento.toLowerCase().includes(filtro.toLowerCase()) ||
        (g.fondo_nombre && g.fondo_nombre.toLowerCase().includes(filtro.toLowerCase()))
    );

    if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}>Cargando módulo de gastos...</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: '0.25rem' }}>
                        Gestión de Gastos
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                        Administración de egresos y legalización de facturas
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div className="badge badge-info" style={{ padding: '0.6rem 1.2rem', borderRadius: '50px', fontWeight: 600 }}>
                        {gastos.length} Registros
                    </div>
                </div>
            </header>

            {mensaje.texto && (
                <div className={`alert alert-${mensaje.tipo} animate-slide-up`} style={{ marginBottom: '2rem' }}>
                    {mensaje.texto}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', alignItems: 'start' }}>
                
                {/* Formulario de Registro */}
                <div className="card" style={{ padding: '2rem', position: 'sticky', top: '2rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700 }}>
                        <PlusCircle size={22} color="var(--primary)" /> Nuevo Gasto
                    </h2>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
                        <div>
                            <label className="label">Concepto / Evento</label>
                            <input 
                                type="text" 
                                name="evento" 
                                placeholder="Ej: Compra de materiales..." 
                                value={nuevoGasto.evento} 
                                onChange={handleChange} 
                                required 
                                className="input" 
                            />
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem' }}>
                            <div>
                                <label className="label">Monto</label>
                                <input 
                                    type="number" 
                                    name="precio" 
                                    placeholder="0.00" 
                                    value={nuevoGasto.precio} 
                                    onChange={handleChange} 
                                    required 
                                    className="input" 
                                />
                            </div>
                            <div>
                                <label className="label">Fondo de Origen</label>
                                <select 
                                    name="fondo_id" 
                                    value={nuevoGasto.fondo_id} 
                                    onChange={handleChange} 
                                    required 
                                    className="input"
                                >
                                    {fondos.map(f => (
                                        <option key={f.id} value={f.id}>{f.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="label">Observaciones</label>
                            <textarea 
                                name="observaciones" 
                                placeholder="Detalles del gasto..." 
                                value={nuevoGasto.observaciones} 
                                onChange={handleChange} 
                                className="textarea"
                                style={{ height: '80px' }}
                            ></textarea>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer', marginBottom: '0.5rem' }}>
                                <input 
                                    type="checkbox" 
                                    name="sin_factura"
                                    checked={nuevoGasto.sin_factura} 
                                    onChange={handleChange} 
                                />
                                Sin comprobante físico
                            </label>

                            {!nuevoGasto.sin_factura && (
                                <>
                                    <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block', width: '100%' }}>
                                        <button type="button" className="btn btn-secondary" style={{ width: '100%', gap: '0.5rem' }}>
                                            <Upload size={18} /> Subir Facturas
                                        </button>
                                        <input 
                                            type="file" 
                                            multiple 
                                            accept="image/*"
                                            style={{ position: 'absolute', left: 0, top: 0, opacity: 0, cursor: 'pointer', height: '100%', width: '100%' }}
                                            onChange={handleFileChange} 
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        {facturas.map((f, i) => (
                                            <span key={i} className="badge badge-info" style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                {f.name.substring(0, 10)}... <Trash2 size={10} style={{ cursor: 'pointer' }} onClick={() => removeFile(i)} />
                                            </span>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-primary" 
                            style={{ height: '3.5rem', fontWeight: 700 }}
                            disabled={submitting}
                        >
                            {submitting ? 'Procesando...' : 'Registrar Gasto'}
                        </button>
                    </form>
                </div>

                {/* Lista de Gastos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Search size={20} color="var(--text-muted)" />
                        <input 
                            type="text" 
                            placeholder="Buscar por concepto o fondo..." 
                            className="input" 
                            style={{ border: 'none', padding: '0.5rem' }} 
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                        />
                        <Filter size={20} color="var(--text-muted)" />
                    </div>

                    <div className="card" style={{ padding: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700 }}>
                            <Receipt size={22} color="var(--success)" /> Historial de Egresos
                        </h2>
                        
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {gastosFiltrados.length > 0 ? (
                                gastosFiltrados.map(gasto => (
                                    <div key={gasto.id} className="animate-slide-up" style={{ 
                                        padding: '1.5rem', 
                                        borderRadius: '20px', 
                                        background: 'var(--background)', 
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                <div style={{ width: '50px', height: '50px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <FileText size={24} />
                                                </div>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>{gasto.evento}</h3>
                                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                                                        <span className="badge" style={{ background: 'var(--surface)', fontSize: '0.75rem' }}>{gasto.fondo_nombre || 'N/A'}</span>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(gasto.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)' }}>-${Number(gasto.precio).toLocaleString()}</div>
                                                <button 
                                                    onClick={() => handleDelete(gasto.id)} 
                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginTop: '0.5rem' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {gasto.observaciones && (
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
                                                {gasto.observaciones}
                                            </p>
                                        )}

                                        {gasto.imagenes && gasto.imagenes.length > 0 && (
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {gasto.imagenes.map((img, idx) => (
                                                    <a 
                                                        key={idx} 
                                                        href={`http://${window.location.hostname}:2014/uploads/${img}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}
                                                    >
                                                        <img 
                                                            src={`http://${window.location.hostname}:2014/uploads/${img}`} 
                                                            alt="Factura" 
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                        />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--background)', borderRadius: '20px', border: '1px dashed var(--border)' }}>
                                    <ImageIcon size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
                                    <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>No se encontraron gastos con ese criterio.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Gastos;