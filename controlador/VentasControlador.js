const VentasModelo = require('../modelo/VentasModelo');
const fs = require('fs');
const path = require('path');

class VentasControlador {

    // ── FONDOS: DISPONIBILIDAD ────────────────────────────────────
    static async obtenerDisponibilidadFondos(req, res) {
        try {
            const fondos = await VentasModelo.obtenerDisponibilidadFondos();
            res.json(fondos);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error al calcular disponibilidad de fondos.' });
        }
    }

    // ── EVENTOS ───────────────────────────────────────────
    static async obtenerEventos(req, res) {
        try {
            const eventos = await VentasModelo.obtenerEventos();
            res.json(eventos);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error al obtener eventos de ventas.' });
        }
    }

    static async crearEvento(req, res) {
        try {
            // fondos_prestamos viene como JSON string o array
            let body = { ...req.body };
            if (typeof body.fondos_prestamos === 'string') {
                body.fondos_prestamos = JSON.parse(body.fondos_prestamos);
            }
            if (req.files && req.files.length > 0) {
                const fileNames = req.files.map(file => file.filename);
                body.archivo_consolidacion = JSON.stringify(fileNames);
            }
            const id = await VentasModelo.crearEvento(body);
            res.json({ success: true, id });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error al crear el evento.' });
        }
    }

    static async eliminarEvento(req, res) {
        try {
            await VentasModelo.eliminarEvento(req.params.id);
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error al eliminar el evento.' });
        }
    }

    static async cambiarEstadoEvento(req, res) {
        try {
            await VentasModelo.actualizarEstadoEvento(req.params.id, req.body.estado);
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error al actualizar el estado.' });
        }
    }

    // ── GASTOS (PRESUPUESTO INICIAL) ─────────────────────
    static async registrarGasto(req, res) {
        try {
            const datos = { ...req.body };
            if (req.file) {
                datos.comprobante_imagen = req.file.filename;
            }
            const id = await VentasModelo.registrarGasto(datos);
            res.json({ success: true, id });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error al registrar el gasto.' });
        }
    }

    static async obtenerGastosPorEvento(req, res) {
        try {
            const gastos = await VentasModelo.obtenerGastosPorEvento(req.params.evento_id);
            res.json(gastos);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error al obtener los gastos.' });
        }
    }

    static async eliminarGasto(req, res) {
        try {
            await VentasModelo.eliminarGasto(req.params.id);
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error al eliminar el gasto.' });
        }
    }

    // ── ASIGNACIONES ──────────────────────────────────────
    static async asignarIntegrantes(req, res) {
        try {
            const evento_id = req.params.evento_id;
            const asignaciones = req.body.asignaciones; // array de objetos
            await VentasModelo.asignarIntegrantes(evento_id, asignaciones);
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error al asignar integrantes.' });
        }
    }

    static async obtenerAsignacionesPorEvento(req, res) {
        try {
            const asignaciones = await VentasModelo.obtenerAsignacionesPorEvento(req.params.evento_id);
            res.json(asignaciones);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error al obtener asignaciones.' });
        }
    }

    static async eliminarAsignacion(req, res) {
        try {
            await VentasModelo.eliminarAsignacion(req.params.id);
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error al eliminar la asignación.' });
        }
    }

    // ── ABONOS ────────────────────────────────────────────
    static async registrarAbono(req, res) {
        try {
            let body = { ...req.body };
            if (req.file) {
                body.comprobante_transferencia = req.file.filename;
            }
            const id = await VentasModelo.registrarAbono(body);
            res.json({ success: true, id });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error al registrar el abono.' });
        }
    }

    static async actualizarCantidadProductos(req, res) {
        try {
            const id = req.params.id;
            const { cantidad_total_productos } = req.body;
            await VentasModelo.actualizarCantidadProductos(id, cantidad_total_productos || 0);
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error al actualizar cantidad de productos.' });
        }
    }

    static async actualizarPrecioUnitario(req, res) {
        try {
            const id = req.params.id;
            const { precio_unidad_venta } = req.body;
            await VentasModelo.actualizarPrecioUnitario(id, precio_unidad_venta || 0);
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error al actualizar precio unitario.' });
        }
    }

    static async obtenerTodosLosAbonosPorEvento(req, res) {
        try {
            const abonos = await VentasModelo.obtenerTodosLosAbonosPorEvento(req.params.evento_id);
            res.json(abonos);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error al obtener los abonos del evento.' });
        }
    }

    static async eliminarAbono(req, res) {
        try {
            await VentasModelo.eliminarAbono(req.params.id);
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Error al eliminar el abono.' });
        }
    }

}

module.exports = VentasControlador;
