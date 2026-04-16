import React, { useEffect, useState } from 'react';
import { fondosEspecificosApi, fondosApi } from '../api';
import { CheckCircle2, Trash2, PlusCircle, Layers, Info, AlertCircle } from 'lucide-react';

const FondosEspecificos = () => {
    const [fondosEspecificos, setFondosEspecificos] = useState([]);
    const [fondos, setFondos] = useState([]);
    const [nuevoFondoEspecifico, setNuevoFondoEspecifico] = useState({ nombre: '', descripcion: '', fondo_id: '' });
    const [loading, setLoading] = useState(true);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [fondosData, fondosEspecificosData] = await Promise.all([
                    fondosApi.getAll(),
                    fondosEspecificosApi.getAll()
                ]);
                setFondos(Array.isArray(fondosData) ? fondosData : []);
                setFondosEspecificos(Array.isArray(fondosEspecificosData) ? fondosEspecificosData : []);
            } catch (error) {
                console.error('Error al cargar los datos:', error);
                setMensaje({ tipo: 'danger', texto: 'Error al conectar con el servidor.' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setNuevoFondoEspecifico({ ...nuevoFondoEspecifico, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const createdFondoEspecifico = await fondosEspecificosApi.create(nuevoFondoEspecifico);
            setFondosEspecificos([...fondosEspecificos, createdFondoEspecifico]);
            setNuevoFondoEspecifico({ nombre: '', descripcion: '', fondo_id: '' });
            setMensaje({ tipo: 'success', texto: 'Fondo específico creado correctamente.' });
        } catch (error) {
            console.error('Error al crear el fondo específico:', error);
            setMensaje({ tipo: 'danger', texto: 'Error al crear el fondo.' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este fondo específico?')) return;
        try {
            await fondosEspecificosApi.delete(id);
            setFondosEspecificos(fondosEspecificos.filter(f => f.id !== id));
        } catch (error) {
            console.error('Error al eliminar el fondo específico:', error);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}>Cargando módulos de fondos...</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem', maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: '0.25rem' }}>
                        Fondos Específicos
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                        Sub-categorización de recursos financieros por propósito
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div className="badge badge-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: '50px', fontWeight: 600 }}>
                        {fondosEspecificos.length} Categorías
                    </div>
                </div>
            </header>

            {mensaje.texto && (
                <div className={`alert alert-${mensaje.tipo} animate-slide-up`} style={{ marginBottom: '2rem' }}>
                    {mensaje.texto}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', alignItems: 'start' }}>
                
                {/* Formulario */}
                <div className="card" style={{ padding: '2rem', position: 'sticky', top: '2rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700 }}>
                        <PlusCircle size={22} color="var(--primary)" /> Nuevo Sub-Fondo
                    </h2>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
                        <div>
                            <label className="label">Nombre Identificador</label>
                            <input 
                                type="text" 
                                name="nombre" 
                                placeholder="Ej: Mantenimiento, Eventos..." 
                                value={nuevoFondoEspecifico.nombre} 
                                onChange={handleChange} 
                                required 
                                className="input" 
                            />
                        </div>
                        
                        <div>
                            <label className="label">Fondo Padre (Origen)</label>
                            <select 
                                name="fondo_id" 
                                value={nuevoFondoEspecifico.fondo_id} 
                                onChange={handleChange} 
                                required 
                                className="input"
                            >
                                <option value="">Seleccionar fondo...</option>
                                {Array.isArray(fondos) && fondos.map(fondo => (
                                    <option key={fondo.id} value={fondo.id}>{fondo.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="label">Descripción / Propósito</label>
                            <textarea 
                                name="descripcion" 
                                placeholder="¿Para qué se usará este dinero?" 
                                value={nuevoFondoEspecifico.descripcion} 
                                onChange={handleChange} 
                                className="textarea"
                                style={{ height: '100px' }}
                            ></textarea>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ height: '3.5rem', fontWeight: 700 }}>
                            Crear Fondo Específico
                        </button>
                    </form>
                </div>

                {/* Lista */}
                <div className="card" style={{ padding: '2rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700 }}>
                        <Layers size={22} color="var(--success)" /> Estructura Actual
                    </h2>
                    
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {fondosEspecificos.length > 0 ? (
                            fondosEspecificos.map(fe => (
                                <div key={fe.id} className="animate-slide-up" style={{ 
                                    padding: '1.25rem', 
                                    borderRadius: '16px', 
                                    background: 'var(--background)', 
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <div style={{ width: '45px', height: '45px', background: 'rgba(46, 204, 113, 0.1)', color: 'var(--success)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Info size={20} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{fe.nombre}</h3>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{fe.descripcion}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(fe.id)} 
                                        className="btn btn-icon" 
                                        style={{ color: 'var(--danger)', background: 'transparent' }}
                                        title="Eliminar"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--background)', borderRadius: '20px', border: '1px dashed var(--border)' }}>
                                <AlertCircle size={40} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                                <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>No hay fondos específicos configurados.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FondosEspecificos;