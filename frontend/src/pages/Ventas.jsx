import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, ChevronDown, ChevronUp, Trash2, 
  DollarSign, ShoppingCart, Download, AlertCircle, CheckCircle2, Info, FileDown
} from 'lucide-react';
import { ventasApi, personasApi } from '../api';
import { generateReporteVentas } from '../reportes/ReporteVentas';
import Swal from 'sweetalert2';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-CO')}`;

// ── COMPONENTE: SELECTOR MULTI-FONDO ────────────────────────────────────────
function SelectorMultiFondo({ fondosDisponibles, onChangeFondos, presupuesto }) {
  const [seleccion, setSeleccion] = useState({}); // { fondo_id: monto }

  const totalSeleccionado = Object.values(seleccion).reduce((s, v) => s + (Number(v) || 0), 0);
  const falta = presupuesto - totalSeleccionado;
  const cubierto = totalSeleccionado >= presupuesto && presupuesto > 0;
  const exceso = totalSeleccionado > presupuesto;

  const handleToggle = (fondo) => {
    setSeleccion(prev => {
      const nuevo = { ...prev };
      if (nuevo[fondo.id] !== undefined) {
        delete nuevo[fondo.id];
      } else {
        // Auto-calcular: poner lo que falta hasta cubrir el presupuesto
        const disponibleActual = presupuesto - Object.values(nuevo).reduce((s, v) => s + (Number(v) || 0), 0);
        const montoSugerido = Math.min(disponibleActual, Number(fondo.disponible));
        nuevo[fondo.id] = montoSugerido > 0 ? montoSugerido : 0;
      }
      return nuevo;
    });
  };

  const handleMontoChange = (fondo_id, valor) => {
    setSeleccion(prev => ({ ...prev, [fondo_id]: valor }));
  };

  // Notifica al padre de los cambios
  useEffect(() => {
    const fondosPrestamos = Object.entries(seleccion)
      .filter(([, monto]) => Number(monto) > 0)
      .map(([fondo_id, monto_prestado]) => ({ fondo_id: Number(fondo_id), monto_prestado: Number(monto_prestado) }));
    onChangeFondos(fondosPrestamos, totalSeleccionado);
  }, [seleccion]);

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
        {fondosDisponibles.map(fondo => {
          const seleccionado = seleccion[fondo.id] !== undefined;
          const monto = seleccion[fondo.id] || '';
          const insuficiente = Number(monto) > Number(fondo.disponible);

          return (
            <div key={fondo.id} style={{
              borderRadius: '10px',
              border: `1.5px solid ${seleccionado ? 'var(--primary)' : 'var(--glass-border)'}`,
              background: seleccionado ? 'rgba(16,185,129,0.05)' : 'var(--surface)',
              padding: '0.75rem 1rem',
              transition: 'all 0.2s'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: seleccionado ? '0.5rem' : 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={seleccionado}
                    onChange={() => handleToggle(fondo)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{fondo.nombre}</div>
                    <div style={{ fontSize: '0.78rem', color: fondo.disponible <= 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      Disponible: <strong style={{ color: fondo.disponible <= 0 ? 'var(--danger)' : 'var(--primary)' }}>{fmt(fondo.disponible)}</strong>
                    </div>
                  </div>
                </label>

                {/* Mini barra de disponibilidad */}
                <div style={{ width: '80px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {seleccionado && monto > 0 && <span style={{ color: insuficiente ? 'var(--danger)' : 'var(--primary)', fontWeight: 600 }}>{fmt(monto)}</span>}
                </div>
              </div>

              {seleccionado && (
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Monto a prestar:</span>
                    <input
                      type="number"
                      min="0"
                      max={fondo.disponible}
                      value={monto}
                      onChange={(e) => handleMontoChange(fondo.id, e.target.value)}
                      className="input-field"
                      style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.875rem', borderColor: insuficiente ? 'var(--danger)' : undefined }}
                    />
                  </div>
                  {insuficiente && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '4px', fontSize: '0.75rem', color: 'var(--danger)' }}>
                      <AlertCircle size={12} /> Excede el disponible del fondo ({fmt(fondo.disponible)})
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Barra de progreso de cobertura */}
      {presupuesto > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Cobertura del presupuesto</span>
            <span style={{ fontWeight: 700, color: cubierto ? 'var(--primary)' : exceso ? 'var(--warning)' : 'var(--danger)' }}>
              {fmt(totalSeleccionado)} / {fmt(presupuesto)}
            </span>
          </div>
          <div style={{ height: '8px', background: 'var(--surface-light)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min((totalSeleccionado / presupuesto) * 100, 100)}%`,
              background: cubierto ? 'var(--primary)' : exceso ? 'var(--warning)' : 'var(--danger)',
              transition: 'width 0.3s, background 0.3s',
              borderRadius: '4px'
            }} />
          </div>
          <div style={{ marginTop: '6px', fontSize: '0.8rem' }}>
            {cubierto && !exceso && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--primary)' }}>
                <CheckCircle2 size={14} /> ¡Presupuesto cubierto! Puedes crear el evento.
              </div>
            )}
            {exceso && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--warning)' }}>
                <Info size={14} /> Exceso de {fmt(totalSeleccionado - presupuesto)}. El excedente no se presta y quedará en los fondos.
              </div>
            )}
            {!cubierto && !exceso && totalSeleccionado > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--danger)' }}>
                <AlertCircle size={14} /> Faltan {fmt(falta)} para cubrir el presupuesto.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
function Ventas() {
  const [eventos, setEventos] = useState([]);
  const [fondosDisponibles, setFondosDisponibles] = useState([]);
  const [personas, setPersonas] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const [showModalEvento, setShowModalEvento] = useState(false);
  const [showModalGasto, setShowModalGasto] = useState(false);
  const [showModalAsignacion, setShowModalAsignacion] = useState(false);
  const [showModalAbono, setShowModalAbono] = useState(false);

  // Formularios
  const [formEvento, setFormEvento] = useState({ nombre: '', fecha: '', presupuesto_total: '' });
  const [fondosPrestamos, setFondosPrestamos] = useState([]); // [{ fondo_id, monto_prestado }]
  const [totalFondosSeleccionados, setTotalFondosSeleccionados] = useState(0);

  const [formGasto, setFormGasto] = useState({ concepto: '', precio: '', archivo: null });
  const [formAsignacion, setFormAsignacion] = useState({ cantidad_productos: 1, precio_unidad: 0, seleccionados: {} });
  const [formAbono, setFormAbono] = useState({ asignacion_id: '', monto_abonado: '', unidades_vendidas: '' });

  const [gastosActuales, setGastosActuales] = useState([]);
  const [asignacionesActuales, setAsignacionesActuales] = useState([]);
  const [abonosActuales, setAbonosActuales] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resEv, resFon, resPer] = await Promise.all([
        ventasApi.getAll(),
        ventasApi.getFondosDisponibilidad(),
        personasApi.getAll()
      ]);
      setEventos(resEv.data);
      setFondosDisponibles(resFon.data);
      setPersonas(resPer.data.filter(p => p.estado === 'activo'));
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudo cargar la información', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadEventoDetails = async (evento_id) => {
    try {
      const [resG, resA, resAb] = await Promise.all([
        ventasApi.getGastos(evento_id),
        ventasApi.getAsignaciones(evento_id),
        ventasApi.getAbonos(evento_id)
      ]);
      setGastosActuales(resG.data);
      setAsignacionesActuales(resA.data);
      setAbonosActuales(resAb.data);
    } catch (e) { console.error(e); }
  };

  const toggleExpand = (id) => {
    if (expandedId === id) { setExpandedId(null); }
    else { setExpandedId(id); loadEventoDetails(id); }
  };

  // ── CREAR EVENTO ───────────────────────────────────────────────
  const handleCrearEvento = async (e) => {
    e.preventDefault();

    const presupuesto = Number(formEvento.presupuesto_total);
    if (presupuesto > 0 && totalFondosSeleccionados < presupuesto) {
      return Swal.fire('Fondos insuficientes', `Faltan ${fmt(presupuesto - totalFondosSeleccionados)} por cubrir con fondos. Agrega más fondos o reduce el presupuesto.`, 'warning');
    }

    // Si hay exceso, ajustar el último fondo para no tomar más de lo necesario
    let fondosAjustados = [...fondosPrestamos];
    if (totalFondosSeleccionados > presupuesto && presupuesto > 0) {
      let acumulado = 0;
      fondosAjustados = fondosPrestamos.map((fp, idx) => {
        if (acumulado >= presupuesto) return { ...fp, monto_prestado: 0 };
        const resto = presupuesto - acumulado;
        const monto = Math.min(fp.monto_prestado, resto);
        acumulado += monto;
        return { ...fp, monto_prestado: monto };
      }).filter(fp => fp.monto_prestado > 0);
    }

    try {
      const fd = new FormData();
      fd.append('nombre', formEvento.nombre);
      fd.append('fecha', formEvento.fecha);
      fd.append('presupuesto_total', formEvento.presupuesto_total);
      fd.append('fondos_prestamos', JSON.stringify(fondosAjustados));
      if (formEvento.archivos_consolidacion) {
        for (let i = 0; i < formEvento.archivos_consolidacion.length; i++) {
          fd.append('archivos_consolidacion', formEvento.archivos_consolidacion[i]);
        }
      }

      await ventasApi.create(fd);
      Swal.fire('¡Evento Creado!', 'Los fondos seleccionados han sido comprometidos.', 'success');
      setShowModalEvento(false);
      setFormEvento({ nombre: '', fecha: '', presupuesto_total: '', archivos_consolidacion: null });
      setFondosPrestamos([]);
      setTotalFondosSeleccionados(0);
      loadData();
    } catch (e) {
      Swal.fire('Error', 'No se pudo crear el evento', 'error');
    }
  };

  const handleEliminarEvento = async (id) => {
    if (await confirmAction('¿Eliminar este evento y TODO su historial?')) {
      try { await ventasApi.delete(id); Swal.fire('Eliminado', '', 'success'); loadData(); }
      catch (e) { Swal.fire('Error', 'No se pudo eliminar', 'error'); }
    }
  };

  // ── GASTOS ─────────────────────────────────────────────────────
  const handleCrearGasto = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('evento_id', expandedId);
    fd.append('concepto', formGasto.concepto);
    fd.append('precio', formGasto.precio);
    if (formGasto.archivo) fd.append('comprobante_imagen', formGasto.archivo);
    try {
      await ventasApi.registrarGasto(fd);
      Swal.fire('Gasto Registrado', '', 'success');
      setShowModalGasto(false);
      setFormGasto({ concepto: '', precio: '', archivo: null });
      loadEventoDetails(expandedId);
      loadData();
    } catch (e) { Swal.fire('Error', 'No se pudo registrar el gasto', 'error'); }
  };

  // ── ASIGNACIONES ───────────────────────────────────────────────
  const openModalAsignacion = () => {
    const preSeleccionados = {};
    personas.forEach(p => preSeleccionados[p.id] = true);
    setFormAsignacion({ cantidad_productos: 1, precio_unidad: 0, seleccionados: preSeleccionados });
    setShowModalAsignacion(true);
  };

  const handleAsignarIntegrantes = async (e) => {
    e.preventDefault();
    const cant = Number(formAsignacion.cantidad_productos);
    const precio = Number(formAsignacion.precio_unidad);
    const total = cant * precio;
    const seleccionados = Object.keys(formAsignacion.seleccionados)
      .filter(id => formAsignacion.seleccionados[id])
      .map(id => ({ persona_id: id, cantidad_productos: cant, precio_unidad: precio, total_esperado: total }));
    if (seleccionados.length === 0) return Swal.fire('Atención', 'Selecciona al menos 1 integrante', 'warning');
    try {
      await ventasApi.asignarIntegrantes(expandedId, { asignaciones: seleccionados });
      Swal.fire('Éxito', 'Integrantes asignados', 'success');
      setShowModalAsignacion(false);
      loadEventoDetails(expandedId);
      loadData();
    } catch (e) { Swal.fire('Error', 'No se pudo asignar', 'error'); }
  };

  // ── ABONOS ─────────────────────────────────────────────────────
  const openAbonoModal = (asig) => {
    setFormAbono({ asignacion_id: asig.id, monto_abonado: '', unidades_vendidas: '', precio_unidad: asig.precio_unidad });
    setShowModalAbono(true);
  };

  const handleRegistrarAbono = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('asignacion_id', formAbono.asignacion_id);
    fd.append('monto_abonado', formAbono.monto_abonado);
    fd.append('unidades_vendidas', formAbono.unidades_vendidas);
    if (formAbono.archivo) fd.append('comprobante_transferencia', formAbono.archivo);
    
    try {
      await ventasApi.registrarAbono(fd);
      Swal.fire('Éxito', 'Abono registrado', 'success');
      setShowModalAbono(false);
      loadEventoDetails(expandedId);
      loadData();
    } catch (e) { Swal.fire('Error', 'No se pudo registrar', 'error'); }
  };

  const handleActualizarCantidad = async (evento_id, cantidad) => {
    try {
      await ventasApi.updateCantidad(evento_id, { cantidad_total_productos: cantidad });
      loadData();
    } catch (e) {
      Swal.fire('Error', 'No se pudo actualizar la cantidad', 'error');
    }
  };

  const handleActualizarPrecioUnitario = async (evento_id, precio) => {
    try {
      await ventasApi.updatePrecio(evento_id, { precio_unidad_venta: precio });
      loadData();
    } catch (e) {
      Swal.fire('Error', 'No se pudo actualizar el precio unitario', 'error');
    }
  };

  const confirmAction = async (title) => {
    const res = await Swal.fire({ title, icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, continuar', cancelButtonText: 'Cancelar' });
    return res.isConfirmed;
  };

  const handleEliminarItem = async (apiCall, id) => {
    if (await confirmAction('¿Seguro?')) {
      try { await apiCall(id); loadEventoDetails(expandedId); loadData(); }
      catch (e) { Swal.fire('Error', 'Ocurrió un error', 'error'); }
    }
  };

  const filteredEventos = eventos.filter(e => e.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Módulo de Ventas</h1>
          <p className="page-subtitle">Organiza eventos, toma presupuestos de fondos y registra tus ganancias en tiempo real.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModalEvento(true)}>
          <Plus size={20} /> Nuevo Evento
        </button>
      </div>

      {/* Resumen de fondos disponibles */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {fondosDisponibles.map(f => (
          <div key={f.id} className="card" style={{ flex: '1', minWidth: '160px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{f.nombre}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: f.disponible > 0 ? 'var(--primary)' : 'var(--danger)' }}>{fmt(f.disponible)}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>disponible</div>
          </div>
        ))}
      </div>

      <div className="card mb-4">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Search size={20} color="var(--text-muted)" />
          <input type="text" placeholder="Buscar evento..." className="input-field" style={{ flex: 1, border: 'none', background: 'transparent' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="grid-1">
        {loading ? <p>Cargando eventos...</p> : filteredEventos.map(ev => {
          const isExpanded = expandedId === ev.id;
          const inver = Number(ev.total_prestado_fondos || 0) || Number(ev.total_invertido || 0);
          const recup = Number(ev.total_recuperado);
          const meta = Number(ev.total_meta);
          const presupuesto = Number(ev.presupuesto_total);

          let percRecuperacion = inver > 0 ? Math.min((recup / inver) * 100, 100) : 0;
          let percGanancia = 0;
          if (recup > inver && inver > 0) {
            const base = meta > 0 ? meta : inver * 1.5;
            percRecuperacion = (inver / base) * 100;
            percGanancia = ((recup - inver) / base) * 100;
          }

          return (
            <div key={ev.id} className="card p-0" style={{ overflow: 'hidden' }}>
              <div className="p-4 cursor-pointer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => toggleExpand(ev.id)}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{ev.nombre}</h3>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>📅 {new Date(ev.fecha).toLocaleDateString()}</span>
                    <span>🏦 <strong style={{ color: 'var(--primary)' }}>{ev.fondo_origen_nombre}</strong></span>
                    <span>👥 {ev.total_integrantes} participantes</span>
                    {presupuesto > 0 && <span>💰 Presupuesto: <strong>{fmt(presupuesto)}</strong></span>}
                  </div>

                  {/* Chips de fondos */}
                  {ev.fondos_prestamos && ev.fondos_prestamos.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {ev.fondos_prestamos.map(fp => (
                        <span key={fp.id} style={{ fontSize: '0.7rem', background: 'rgba(16,185,129,0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(16,185,129,0.3)' }}>
                          {fp.fondo_nombre}: {fmt(fp.monto_prestado)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PRESTADO</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--warning)' }}>{fmt(inver)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RECAUDADO</div>
                    <div style={{ fontWeight: 'bold', color: recup > inver ? 'var(--primary)' : 'var(--text)' }}>{fmt(recup)}</div>
                  </div>
                  <button className="btn btn-ghost" style={{ padding: '0.5rem' }} onClick={(e) => { e.stopPropagation(); handleEliminarEvento(ev.id); }}>
                    <Trash2 size={18} color="var(--danger)" />
                  </button>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* Barra de progreso doble */}
              <div style={{ height: '6px', width: '100%', background: 'var(--surface-light)', display: 'flex' }}>
                <div style={{ width: `${percRecuperacion}%`, background: 'var(--warning)', transition: 'width 0.5s' }} />
                <div style={{ width: `${percGanancia}%`, background: 'var(--primary)', transition: 'width 0.5s' }} />
              </div>

              {isExpanded && (
                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>

                  {/* ── FACTURAS ADJUNTAS ── */}
                  {ev.archivo_consolidacion && (() => {
                    try {
                      const files = JSON.parse(ev.archivo_consolidacion);
                      if (Array.isArray(files) && files.length > 0) return (
                        <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(16,185,129,0.06)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>📄 FACTURAS ADJUNTAS:</span>
                          {files.map((file, idx) => (
                            <a key={idx} href={`http://localhost:2014/uploads/${file}`} target="_blank" rel="noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, padding: '4px 12px', background: 'rgba(16,185,129,0.12)', borderRadius: '20px', border: '1px solid rgba(16,185,129,0.3)' }}>
                              <FileDown size={14} /> Factura {idx + 1}
                            </a>
                          ))}
                        </div>
                      );
                    } catch (e) {}
                    return null;
                  })()}

                  {/* ── PASO 1: CONFIGURAR PRODUCTOS ── */}
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface-light)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>1</span>
                      <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '0.95rem' }}>Configurar Producto a Vender</h4>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div style={{ flex: '1', minWidth: '140px' }}>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Cantidad Total de Unidades</label>
                        <input
                          type="number" min="0"
                          className="input-field"
                          style={{ margin: 0 }}
                          key={`qty-${ev.id}-${ev.cantidad_total_productos}`}
                          defaultValue={ev.cantidad_total_productos > 0 ? ev.cantidad_total_productos : ''}
                          placeholder="Ej: 170"
                          onBlur={(e) => { if (e.target.value) handleActualizarCantidad(ev.id, e.target.value); }}
                        />
                      </div>
                      <div style={{ flex: '1', minWidth: '140px' }}>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Precio de Venta por Unidad ($)</label>
                        <input
                          type="number" min="0"
                          className="input-field"
                          style={{ margin: 0 }}
                          key={`price-${ev.id}-${ev.precio_unidad_venta}`}
                          defaultValue={ev.precio_unidad_venta > 0 ? ev.precio_unidad_venta : ''}
                          placeholder="Ej: 20000"
                          onBlur={(e) => { if (e.target.value) handleActualizarPrecioUnitario(ev.id, e.target.value); }}
                        />
                      </div>
                      {ev.cantidad_total_productos > 0 && ev.precio_unidad_venta > 0 && (
                        <div style={{ padding: '0.6rem 1rem', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Meta de recaudo</div>
                          <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.05rem' }}>{fmt(ev.cantidad_total_productos * ev.precio_unidad_venta)}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── PASO 2: GASTOS E INTEGRANTES ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

                    {/* GASTOS */}
                    <div style={{ padding: '1rem', background: 'var(--surface-light)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ background: '#f59e0b', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>2a</span>
                          <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '0.95rem' }}>Gastos / Inversión</h4>
                        </div>
                        <button className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '2px 8px', color: 'var(--primary)' }} onClick={() => setShowModalGasto(true)}>
                          + Agregar
                        </button>
                      </div>
                      {gastosActuales.length === 0
                        ? <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>Sin gastos registrados aún.</p>
                        : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {gastosActuales.map(g => (
                              <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{g.concepto}</div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(g.created_at).toLocaleDateString()}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontWeight: 'bold', color: 'var(--warning)', fontSize: '0.9rem' }}>{fmt(g.precio)}</span>
                                  <Trash2 size={14} color="var(--danger)" style={{ cursor: 'pointer' }} onClick={() => handleEliminarItem(ventasApi.eliminarGasto, g.id)} />
                                </div>
                              </div>
                            ))}
                            <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--warning)', fontSize: '0.85rem', marginTop: '4px' }}>
                              Total: {fmt(gastosActuales.reduce((s, g) => s + Number(g.precio), 0))}
                            </div>
                          </div>
                        )}
                    </div>

                    {/* INTEGRANTES */}
                    <div style={{ padding: '1rem', background: 'var(--surface-light)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ background: '#f59e0b', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>2b</span>
                          <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '0.95rem' }}>Integrantes y Metas</h4>
                        </div>
                        <button className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '2px 8px', color: 'var(--primary)' }} onClick={openModalAsignacion}>
                          {asignacionesActuales.length === 0 ? '+ Asignar' : 'Editar'}
                        </button>
                      </div>
                      {asignacionesActuales.length === 0
                        ? <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>Aún no se han asignado integrantes. Haz clic en "+ Asignar".</p>
                        : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '220px', overflowY: 'auto' }}>
                            {asignacionesActuales.map(a => {
                              const total_ab = Number(a.total_abonado);
                              const total_esp = Number(a.total_esperado);
                              const perc = total_esp > 0 ? Math.min((total_ab / total_esp) * 100, 100) : 0;
                              const pagado = total_ab >= total_esp && total_esp > 0;
                              return (
                                <div key={a.id} style={{ padding: '0.6rem 0.75rem', background: 'var(--surface)', borderRadius: '8px', border: `1px solid ${pagado ? 'rgba(16,185,129,0.4)' : 'var(--glass-border)'}` }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.persona_nombre}</span>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.75rem', color: pagado ? 'var(--primary)' : 'var(--warning)', fontWeight: 700 }}>
                                        {pagado ? '✅' : `${fmt(total_ab)} / ${fmt(total_esp)}`}
                                      </span>
                                      <button
                                        className="btn btn-primary"
                                        style={{ padding: '2px 8px', fontSize: '0.72rem', height: 'auto' }}
                                        onClick={() => openAbonoModal(a)}
                                      >
                                        + Ingreso
                                      </button>
                                      <Trash2 size={13} color="var(--danger)" style={{ cursor: 'pointer' }} onClick={() => handleEliminarItem(ventasApi.eliminarAsignacion, a.id)} />
                                    </div>
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                    {a.cantidad_productos} uds × {fmt(a.precio_unidad)} — Vendidas: <strong style={{ color: 'var(--text)' }}>{a.total_unidades_vendidas || 0}</strong>
                                  </div>
                                  <div style={{ height: '4px', background: 'var(--surface-light)', borderRadius: '2px' }}>
                                    <div style={{ height: '100%', width: `${perc}%`, background: pagado ? 'var(--primary)' : 'var(--warning)', borderRadius: '2px', transition: 'width 0.4s' }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* ── PASO 3: HISTORIAL DE INGRESOS ── */}
                  <div style={{ padding: '1rem', background: 'var(--surface-light)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>3</span>
                        <h4 style={{ margin: 0, color: 'var(--text)', fontSize: '0.95rem' }}>Historial de Ingresos / Pagos</h4>
                      </div>
                      <button className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '2px 8px', border: '1px solid var(--glass-border)' }} onClick={() => generateReporteVentas(ev, gastosActuales, asignacionesActuales, abonosActuales)}>
                        <Download size={14} /> PDF
                      </button>
                    </div>
                    {abonosActuales.length === 0
                      ? <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>Aún no hay pagos registrados. Usa el botón "+ Ingreso" de cada integrante para registrar los pagos.</p>
                      : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '0.5rem 0.75rem' }}>Fecha</th>
                                <th style={{ padding: '0.5rem 0.75rem' }}>Integrante</th>
                                <th style={{ padding: '0.5rem 0.75rem' }}>Monto</th>
                                <th style={{ padding: '0.5rem 0.75rem' }}>Uds.</th>
                                <th style={{ padding: '0.5rem 0.75rem' }}>Comprobante</th>
                                <th style={{ padding: '0.5rem 0.75rem' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {abonosActuales.map(ab => (
                                <tr key={ab.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>{new Date(ab.fecha_registro).toLocaleDateString()}</td>
                                  <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{ab.persona_nombre}</td>
                                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--primary)', fontWeight: 700 }}>{fmt(ab.monto_abonado)}</td>
                                  <td style={{ padding: '0.5rem 0.75rem' }}>{ab.unidades_vendidas > 0 ? ab.unidades_vendidas : '-'}</td>
                                  <td style={{ padding: '0.5rem 0.75rem' }}>
                                    {ab.comprobante_transferencia
                                      ? <a href={`http://localhost:2014/uploads/${ab.comprobante_transferencia}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none', padding: '2px 8px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.3)' }}>📎 Ver</a>
                                      : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>}
                                  </td>
                                  <td style={{ padding: '0.5rem 0.75rem' }}>
                                    <Trash2 size={14} color="var(--danger)" style={{ cursor: 'pointer' }} onClick={() => handleEliminarItem(ventasApi.eliminarAbono, ab.id)} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2rem', marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem 0.75rem', background: 'var(--surface)', borderRadius: '8px' }}>
                            <span>Total ingresos: <strong style={{ color: 'var(--primary)' }}>{fmt(abonosActuales.reduce((s, a) => s + Number(a.monto_abonado), 0))}</strong></span>
                            <span>Total uds. vendidas: <strong style={{ color: 'var(--text)' }}>{abonosActuales.reduce((s, a) => s + Number(a.unidades_vendidas || 0), 0)}</strong></span>
                          </div>
                        </div>
                      )}
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── MODAL: CREAR EVENTO CON MULTI-FONDO ─────────────────── */}
      {showModalEvento && (
        <div className="modal-overlay" style={{ zIndex: 90 }}>
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>Nuevo Evento de Ventas</h2>
              <button className="btn btn-ghost" onClick={() => setShowModalEvento(false)}><span style={{ color: 'var(--text)', fontSize: '1.5rem' }}>&times;</span></button>
            </div>
            <form onSubmit={handleCrearEvento} className="modal-body">
              <div className="form-group">
                <label>Nombre del Evento</label>
                <input required type="text" className="input-field" placeholder="Ej: Venta de Burros" value={formEvento.nombre} onChange={e => setFormEvento({ ...formEvento, nombre: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Fecha</label>
                <input required type="date" className="input-field" value={formEvento.fecha} onChange={e => setFormEvento({ ...formEvento, fecha: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Presupuesto Total Necesario (Inversión estimada)</label>
                <input required type="number" min="1" className="input-field" placeholder="Ej: 300000" value={formEvento.presupuesto_total} onChange={e => setFormEvento({ ...formEvento, presupuesto_total: e.target.value })} />
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Este es el monto total que necesitas pedir prestado de los fondos para el evento.</small>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Fondos Prestamistas <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>(selecciona uno o varios)</span>
                </label>
                {formEvento.presupuesto_total > 0 ? (
                  <SelectorMultiFondo
                    key={formEvento.presupuesto_total}
                    fondosDisponibles={fondosDisponibles}
                    presupuesto={Number(formEvento.presupuesto_total)}
                    onChangeFondos={(fondos, total) => { setFondosPrestamos(fondos); setTotalFondosSeleccionados(total); }}
                  />
                ) : (
                  <div style={{ padding: '1rem', background: 'var(--surface-light)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                    Ingresa primero el presupuesto total para ver las opciones de fondos.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Archivos de Consolidación (Opcional)</label>
                <input type="file" multiple className="input-field" accept="image/*,.pdf" onChange={e => setFormEvento({ ...formEvento, archivos_consolidacion: e.target.files })} />
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Puedes subir uno o más archivos (facturas, comprobantes).</small>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModalEvento(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={fondosPrestamos.length === 0 && Number(formEvento.presupuesto_total) > 0}>
                  Crear Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR GASTO ─────────────────────────────── */}
      {showModalGasto && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Agregar Gasto / Inversión</h2>
              <button className="btn btn-ghost" onClick={() => setShowModalGasto(false)}><span style={{ color: 'var(--text)', fontSize: '1.5rem' }}>&times;</span></button>
            </div>
            <form onSubmit={handleCrearGasto} className="modal-body">
              <div className="form-group">
                <label>Concepto</label>
                <input required type="text" className="input-field" placeholder="Ej: 10 Libras de Carne" value={formGasto.concepto} onChange={e => setFormGasto({ ...formGasto, concepto: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Precio</label>
                <input required type="number" className="input-field" placeholder="Ej: 150000" value={formGasto.precio} onChange={e => setFormGasto({ ...formGasto, precio: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Foto de Factura (Opcional)</label>
                <input type="file" className="input-field" accept="image/*" onChange={e => setFormGasto({ ...formGasto, archivo: e.target.files[0] })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModalGasto(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar Gasto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ASIGNAR INTEGRANTES ─────────────────────────── */}
      {showModalAsignacion && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Asignar Responsabilidades</h2>
              <button className="btn btn-ghost" onClick={() => setShowModalAsignacion(false)}><span style={{ color: 'var(--text)', fontSize: '1.5rem' }}>&times;</span></button>
            </div>
            <form onSubmit={handleAsignarIntegrantes} className="modal-body">
              <div className="grid-2">
                <div className="form-group">
                  <label>Unidades por persona</label>
                  <input required type="number" min="1" className="input-field" value={formAsignacion.cantidad_productos} onChange={e => setFormAsignacion({ ...formAsignacion, cantidad_productos: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Precio Unitario de Venta</label>
                  <input required type="number" min="1" className="input-field" value={formAsignacion.precio_unidad} onChange={e => setFormAsignacion({ ...formAsignacion, precio_unidad: e.target.value })} />
                </div>
              </div>
              <div style={{ background: 'rgba(16,185,129,0.1)', padding: '1rem', borderRadius: '8px', color: 'var(--primary)', marginBottom: '1rem', fontWeight: 'bold', textAlign: 'center' }}>
                Meta por persona: {fmt(formAsignacion.cantidad_productos * formAsignacion.precio_unidad)}
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Participantes
                  <span style={{ fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer' }} onClick={() => {
                    const toggle = Object.values(formAsignacion.seleccionados).some(v => !v);
                    const newSel = {};
                    personas.forEach(p => newSel[p.id] = toggle);
                    setFormAsignacion({ ...formAsignacion, seleccionados: newSel });
                  }}>Marcar/Desmarcar Todos</span>
                </label>
                <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'var(--surface-light)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {personas.map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!formAsignacion.seleccionados[p.id]} onChange={(e) => setFormAsignacion({ ...formAsignacion, seleccionados: { ...formAsignacion.seleccionados, [p.id]: e.target.checked } })} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                      <span style={{ color: 'var(--text)' }}>{p.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModalAsignacion(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Asignar y Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR ABONO ─────────────────────────────── */}
      {showModalAbono && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Registrar Venta / Abono</h2>
              <button className="btn btn-ghost" onClick={() => setShowModalAbono(false)}><span style={{ color: 'var(--text)', fontSize: '1.5rem' }}>&times;</span></button>
            </div>
            <form onSubmit={handleRegistrarAbono} className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Flexible: ingresa el dinero exacto recaudado (parcial o total).</p>
              <div className="form-group">
                <label>Dinero Recaudado ($)</label>
                <input required type="number" min="0" className="input-field" placeholder="Ej: 30000" value={formAbono.monto_abonado} onChange={e => setFormAbono({ ...formAbono, monto_abonado: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Unidades Vendidas (Opcional)</label>
                <input 
                  type="number" 
                  min="0" 
                  className="input-field" 
                  placeholder="Ej: 2" 
                  value={formAbono.unidades_vendidas} 
                  onChange={e => {
                    const unidades = e.target.value;
                    const nuevoMonto = formAbono.precio_unidad ? Number(unidades) * Number(formAbono.precio_unidad) : formAbono.monto_abonado;
                    setFormAbono({ ...formAbono, unidades_vendidas: unidades, monto_abonado: unidades !== '' ? nuevoMonto : formAbono.monto_abonado });
                  }} 
                />
                <small style={{ color: 'var(--text-muted)' }}>El monto se calculará automáticamente según el precio asignado ({fmt(formAbono.precio_unidad)}/ud).</small>
              </div>
              <div className="form-group">
                <label>Comprobante de Transferencia (Obligatorio/Opcional)</label>
                <input type="file" className="input-field" accept="image/*,.pdf" onChange={e => setFormAbono({ ...formAbono, archivo: e.target.files[0] })} />
                <small style={{ color: 'var(--text-muted)' }}>Sube una foto o PDF del recibo o transferencia bancaria.</small>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModalAbono(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Abono</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ventas;
