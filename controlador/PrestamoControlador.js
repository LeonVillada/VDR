const PrestamoModelo = require('../modelo/PrestamoModelo');

class PrestamoControlador {

    // GET /api/prestamos
    static async obtenerPrestamos(req, res) {
        try {
            const prestamos = await PrestamoModelo.obtenerTodos();
            res.json(prestamos);
        } catch (err) {
            console.error('Error obtenerPrestamos:', err);
            res.status(500).json({ error: err.message });
        }
    }

    // GET /api/prestamos/estadisticas
    static async obtenerEstadisticas(req, res) {
        try {
            const stats = await PrestamoModelo.obtenerEstadisticas();
            res.json(stats);
        } catch (err) {
            console.error('Error estadisticasPrestamos:', err);
            res.status(500).json({ error: err.message });
        }
    }

    // GET /api/prestamos/:id
    static async obtenerPorId(req, res) {
        try {
            const prestamo = await PrestamoModelo.obtenerPorId(req.params.id);
            if (!prestamo) return res.status(404).json({ error: 'Préstamo no encontrado' });
            res.json(prestamo);
        } catch (err) {
            console.error('Error obtenerPorId:', err);
            res.status(500).json({ error: err.message });
        }
    }

    // POST /api/prestamos
    static async crearPrestamo(req, res) {
        try {
            const id = await PrestamoModelo.crear(req.body);
            res.status(201).json({ id, mensaje: 'Préstamo creado correctamente' });
        } catch (err) {
            console.error('Error crearPrestamo:', err);
            res.status(400).json({ error: err.message }); // Cambiado a 400 para errores de validación
        }
    }

    // PUT /api/prestamos/:id
    static async actualizarPrestamo(req, res) {
        try {
            await PrestamoModelo.actualizar(req.params.id, req.body);
            res.json({ mensaje: 'Préstamo actualizado' });
        } catch (err) {
            console.error('Error actualizarPrestamo:', err);
            res.status(500).json({ error: err.message });
        }
    }

    // DELETE /api/prestamos/:id
    static async eliminarPrestamo(req, res) {
        try {
            await PrestamoModelo.eliminar(req.params.id);
            res.json({ mensaje: 'Préstamo eliminado' });
        } catch (err) {
            console.error('Error eliminarPrestamo:', err);
            res.status(500).json({ error: err.message });
        }
    }

    // POST /api/prestamos/:id/abonos
    static async registrarAbono(req, res) {
        try {
            const { fecha_abono, monto_abono, tipo_abono, notas } = req.body;
            const id = await PrestamoModelo.registrarAbono({
                prestamo_id: req.params.id,
                fecha_abono,
                monto_abono,
                tipo_abono,
                notas
            });
            res.status(201).json({ id, mensaje: 'Abono registrado correctamente' });
        } catch (err) {
            console.error('Error registrarAbono:', err);
            res.status(500).json({ error: err.message });
        }
    }

    // DELETE /api/prestamos/abonos/:id
    static async eliminarAbono(req, res) {
        try {
            await PrestamoModelo.eliminarAbono(req.params.id);
            res.json({ mensaje: 'Abono eliminado' });
        } catch (err) {
            console.error('Error eliminarAbono:', err);
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = PrestamoControlador;
