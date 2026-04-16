import React, { useEffect, useState } from 'react';
import { fondosApi } from '../api';
import { CheckCircle2, Trash2, PlusCircle } from 'lucide-react';

const Fondos = () => {
    const [fondos, setFondos] = useState([]);
    const [nuevoFondo, setNuevoFondo] = useState({ nombre: '', descripcion: '' });

    useEffect(() => {
        const fetchFondos = async () => {
            try {
                const data = await fondosApi.getAll();
                setFondos(data);
            } catch (error) {
                console.error('Error al cargar los fondos:', error);
            }
        };
        fetchFondos();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setNuevoFondo({ ...nuevoFondo, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const createdFondo = await fondosApi.create(nuevoFondo);
            setFondos([...fondos, createdFondo]);
            setNuevoFondo({ nombre: '', descripcion: '' });
        } catch (error) {
            console.error('Error al crear el fondo:', error);
        }
    };

    const handleDelete = async (id) => {
        try {
            await fondosApi.delete(id);
            setFondos(fondos.filter(f => f.id !== id));
        } catch (error) {
            console.error('Error al eliminar el fondo:', error);
        }
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-1px' }}>Gestión de Fondos</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Administra y visualiza los fondos disponibles</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-info" style={{ padding: '0.5rem 1rem' }}>Módulo Activo</span>
                </div>
            </header>

            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <PlusCircle size={20} color="var(--primary)" /> Registrar Nuevo Fondo
                </h2>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                    <input type="text" name="nombre" placeholder="Nombre del Fondo" value={nuevoFondo.nombre} onChange={handleChange} required className="input" />
                    <textarea name="descripcion" placeholder="Descripción" value={nuevoFondo.descripcion} onChange={handleChange} className="textarea"></textarea>
                    <button type="submit" className="btn btn-primary">Agregar Fondo</button>
                </form>
            </div>

            <div className="card" style={{ padding: '2rem' }}>
                <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={20} color="var(--success)" /> Lista de Fondos
                </h2>
                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1rem' }}>
                    {Array.isArray(fondos) && fondos.length > 0 ? (
                        fondos.map(fondo => (
                            <li key={fondo.id} style={{ padding: '1rem', borderRadius: '12px', background: 'var(--surface)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ fontWeight: 600, fontSize: '1rem' }}>Nombre: {fondo.nombre}</p>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Descripción: {fondo.descripcion}</p>
                                    </div>
                                    <button onClick={() => handleDelete(fondo.id)} className="btn btn-danger">
                                        <Trash2 size={16} /> Eliminar
                                    </button>
                                </div>
                            </li>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            <CheckCircle2 size={40} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                            <p>No hay fondos registrados.</p>
                        </div>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default Fondos;