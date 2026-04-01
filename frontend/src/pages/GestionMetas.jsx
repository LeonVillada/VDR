import React, { useEffect, useState } from 'react';
import { Target, Plus, Edit2, Trash2 } from 'lucide-react';
import { metasApi } from '../api';

const GestionMetas = () => {
    const [metas, setMetas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ nombre: '', porcentaje: '', descripcion: '' });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchMetas();
    }, []);

    const fetchMetas = async () => {
        try {
            const res = await metasApi.getAll();
            setMetas(res.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await metasApi.update(editingId, formData);
            } else {
                await metasApi.create(formData);
            }
            setShowModal(false);
            setFormData({ nombre: '', porcentaje: '', descripcion: '' });
            setEditingId(null);
            fetchMetas();
        } catch (err) { console.error(err); }
    };

    const handleEdit = (meta) => {
        setFormData({ nombre: meta.nombre, porcentaje: meta.porcentaje, descripcion: meta.descripcion });
        setEditingId(meta.id);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Seguro que deseas eliminar esta meta?')) {
            try {
                await metasApi.delete(id);
                fetchMetas();
            } catch (err) { console.error(err); }
        }
    };

    const totalPorcentaje = metas.reduce((sum, m) => sum + parseFloat(m.porcentaje || 0), 0);

    return (
        <div className="animate-fade-in">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Gestión de Metas</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Administra la distribución del presupuesto anual.</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ nombre: '', porcentaje: '', descripcion: '' });
                        setShowModal(true);
                    }}
                >
                    <Plus size={20} /> Nueva Meta
                </button>
            </header>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Porcentaje Asignado:</span>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: totalPorcentaje > 100 ? 'var(--danger)' : 'var(--success)' }}>
                            {totalPorcentaje}%
                        </div>
                    </div>
                    {totalPorcentaje < 100 && (
                        <div style={{ fontSize: '0.9rem', color: 'var(--warning)' }}>
                            Falta asignar: <b>{100 - totalPorcentaje}%</b>
                        </div>
                    )}
                    {totalPorcentaje > 100 && (
                        <div style={{ fontSize: '0.9rem', color: 'var(--danger)' }}>
                            ¡Error! Te has excedido un <b>{totalPorcentaje - 100}%</b>
                        </div>
                    )}
                </div>
                <div style={{ height: '10px', background: 'var(--surface-hover)', borderRadius: '5px', marginTop: '1rem', overflow: 'hidden', display: 'flex' }}>
                    {metas.map((m, idx) => (
                        <div
                            key={m.id}
                            style={{
                                width: `${m.porcentaje}%`,
                                background: `hsl(${140 + (idx * 30)}, 70%, 50%)`,
                                height: '100%'
                            }}
                            title={`${m.nombre}: ${m.porcentaje}%`}
                        ></div>
                    ))}
                </div>
            </div>

            <div className="grid-metas" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {metas.map((meta) => (
                    <div key={meta.id} className="card" style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div style={{ background: 'var(--surface-hover)', padding: '0.5rem', borderRadius: '8px' }}>
                                <Target size={24} color="var(--primary)" />
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={() => handleEdit(meta)}>
                                    <Edit2 size={16} />
                                </button>
                                <button className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--danger)' }} onClick={() => handleDelete(meta.id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{meta.nombre}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', height: '40px', overflow: 'hidden' }}>
                            {meta.descripcion || 'Sin descripción'}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Asignación</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{meta.porcentaje}%</span>
                        </div>
                    </div>
                ))}
            </div>

            {loading && <p>Cargando metas...</p>}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '1.5rem' }}>{editingId ? 'Editar Meta' : 'Crear Nueva Meta'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nombre de la Meta / Actividad</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    placeholder="Ej: Fiesta Fin de Año"
                                />
                            </div>
                            <div className="form-group">
                                <label>Porcentaje (%) del Presupuesto</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={formData.porcentaje}
                                    onChange={e => setFormData({ ...formData, porcentaje: e.target.value })}
                                    placeholder="Ej: 20"
                                />
                            </div>
                            <div className="form-group">
                                <label>Descripción</label>
                                <textarea
                                    style={{
                                        width: '100%',
                                        background: 'var(--surface-hover)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '10px',
                                        padding: '0.75rem',
                                        color: 'var(--text)',
                                        outline: 'none',
                                        minHeight: '100px'
                                    }}
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                    placeholder="Detalles sobre en qué se invertirá este dinero..."
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Guardar Meta</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionMetas;
