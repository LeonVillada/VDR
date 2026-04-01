import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Users, FileText, CreditCard } from 'lucide-react';
import { personasApi, pagosApi } from '../api';

const Personas = () => {
    const [personas, setPersonas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showMassive, setShowMassive] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', cuota: 20000, fecha_ingreso: new Date().toISOString().split('T')[0] });
    const [massiveText, setMassiveText] = useState('');
    const [showPayModal, setShowPayModal] = useState(false);
    const [payData, setPayData] = useState({ persona_id: '', persona_nombre: '', monto: '', quincena: '' });

    useEffect(() => {
        fetchPersonas();
    }, []);

    const fetchPersonas = async () => {
        setLoading(true);
        try {
            const res = await personasApi.getAll();
            const sorted = res.data.sort((a, b) => a.nombre.localeCompare(b.nombre));
            setPersonas(sorted);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await personasApi.update(editing.id, formData);
            } else {
                await personasApi.create(formData);
            }
            setShowModal(false);
            setEditing(null);
            setFormData({ nombre: '', cuota: 20000, fecha_ingreso: new Date().toISOString().split('T')[0] });
            fetchPersonas();
        } catch (err) { console.error(err); }
    };

    const handleMassiveSubmit = async () => {
        try {
            const lines = massiveText.split('\n').filter(l => l.trim());
            const data = lines.map(line => {
                const [nombre, cuota] = line.split(',');
                return { nombre: nombre.trim(), cuota: parseInt(cuota) || 20000 };
            });
            await personasApi.createMasivo(data);
            setShowMassive(false);
            setMassiveText('');
            fetchPersonas();
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Seguro que desea eliminar este integrante?')) {
            try {
                await personasApi.delete(id);
                fetchPersonas();
            } catch (err) { console.error(err); }
        }
    };

    return (
        <div className="animate-fade-in">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Integrantes</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Gestión de miembros y sus cuotas estipuladas.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-ghost" onClick={() => setShowMassive(true)}>
                        <FileText size={20} /> Registro Masivo
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={20} /> Nuevo Integrante
                    </button>
                </div>
            </header>

            <div className="card">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Cuota Quincenal</th>
                            <th>Quincenas Pendientes</th>
                            <th>Penalización</th>
                            <th>Total Deuda</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {personas.map(p => (
                            <tr key={p.id}>
                                <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                                <td>${p.cuota.toLocaleString()}</td>
                                <td style={{ color: p.quincenas_pendientes > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
                                    {p.quincenas_pendientes > 0 ? `-${p.quincenas_pendientes} ($${p.total_deuda.toLocaleString()})` : 'Al día'}
                                    {p.penalizacion_sugerida > 0 && <span style={{ display: 'block', fontSize: '0.7em', color: 'var(--warning)' }}>Incluye multa ${p.penalizacion_sugerida.toLocaleString()}</span>}
                                </td>
                                <td style={{ color: p.penalizacion_sugerida > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                    ${p.penalizacion_sugerida.toLocaleString()}
                                </td>
                                <td style={{ fontWeight: 700, color: p.total_deuda > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                    ${p.total_deuda.toLocaleString()}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-ghost" style={{ color: 'var(--primary)' }} onClick={() => {
                                            setPayData({ persona_id: p.id, persona_nombre: p.nombre, monto: p.cuota, quincena: '' });
                                            setShowPayModal(true);
                                        }} title="Registrar Pago Rápido">
                                            <CreditCard size={18} />
                                        </button>
                                        <button className="btn btn-ghost" onClick={() => {
                                            setEditing(p);
                                            setFormData({ nombre: p.nombre, cuota: p.cuota, fecha_ingreso: p.fecha_ingreso.split('T')[0] });
                                            setShowModal(true);
                                        }}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(p.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de Creación/Edición */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--primary)' }}>
                                {editing ? 'Editar' : 'Nuevo'} Integrante
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Información necesaria para el control de aportes.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nombre Completo</label>
                                <input
                                    required
                                    autoFocus
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    placeholder="Ej. Juan Perez"
                                />
                            </div>
                            <div className="form-group">
                                <label>Cuota Quincenal ($)</label>
                                <input
                                    type="number"
                                    required
                                    value={formData.cuota}
                                    onChange={e => setFormData({ ...formData, cuota: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Fecha de Ingreso</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.fecha_ingreso}
                                    onChange={e => setFormData({ ...formData, fecha_ingreso: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                <button type="button" className="btn btn-ghost" style={{ padding: '0.5rem 1rem' }} onClick={() => setShowModal(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 2rem' }}>
                                    {editing ? 'Guardar' : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Masivo */}
            {showMassive && (
                <div className="modal-overlay" onClick={() => setShowMassive(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Registro Masivo</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Ingresa un integrante por línea con el formato: <b>Nombre, Cuota</b>
                        </p>
                        <textarea
                            style={{
                                width: '100%', minHeight: '200px', background: 'var(--surface-hover)',
                                border: '1px solid var(--glass-border)', color: 'white', padding: '1rem', borderRadius: '16px',
                                outline: 'none', resize: 'vertical'
                            }}
                            value={massiveText}
                            onChange={e => setMassiveText(e.target.value)}
                            placeholder="Juan Perez, 20000&#10;Maria Gomez, 25000"
                        />
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button className="btn btn-ghost" onClick={() => setShowMassive(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleMassiveSubmit}>Procesar Lista</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Pago Rápido */}
            {showPayModal && (
                <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--primary)' }}>
                                Cobrar a {payData.persona_nombre}
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Confirma el pago de la cuota quincenal.
                            </p>
                        </div>

                        <div className="form-group">
                            <label>Monto a Recibir ($)</label>
                            <input type="number" value={payData.monto} onChange={e => setPayData({ ...payData, monto: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Quincena / Referencia</label>
                            <input placeholder="Ej. Q1 Febrero" value={payData.quincena} onChange={e => setPayData({ ...payData, quincena: e.target.value })} />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
                            <button className="btn btn-ghost" onClick={() => setShowPayModal(false)}>Cancelar</button>
                            <button className="btn btn-primary" style={{ padding: '0.75rem 3rem' }} onClick={async () => {
                                try {
                                    await pagosApi.create({
                                        persona_id: payData.persona_id,
                                        monto: payData.monto,
                                        fecha: new Date().toISOString().split('T')[0],
                                        quincena: payData.quincena
                                    });
                                    setShowPayModal(false);
                                    fetchPersonas();
                                } catch (err) { console.error(err); }
                            }}>
                                Confirmar Pago
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Personas;
