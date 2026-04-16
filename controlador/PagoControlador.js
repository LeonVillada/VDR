const PagoModelo = require('../modelo/PagoModelo');
const PersonaModelo = require('../modelo/PersonasModelo');

const obtenerPagos = async (req, res) => {
    try {
        const pagos = await PagoModelo.obtenerTodos();
        res.json(pagos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const obtenerPagosPorPersona = async (req, res) => {
    try {
        const pagos = await PagoModelo.obtenerPorPersona(req.params.persona_id);
        res.json(pagos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const registrarPago = async (req, res) => {
    try {
        const { persona_id, monto, fecha, quincena } = req.body;

        // Registrar el pago
        const idPago = await PagoModelo.crear({
            persona_id,
            monto,
            fecha: fecha || new Date().toISOString().split('T')[0],
            quincena
        });

        // Opcional: Actualizar el estado de la persona si manejamos quincenas_pendientes en DB
        // Pero es mejor calcularlo dinámicamente. 
        // Si el usuario quiere que esté en la DB, lo actualizamos.
        const persona = await PersonaModelo.obtenerPorId(persona_id);
        if (persona) {
            // Lógica simple: si el pago es mayor o igual a una cuota, reducir una quincena pendiente
            // Pero esto depende de cómo el usuario registre los pagos.
            // Por ahora, solo registramos el pago.
        }

        res.status(201).json({ mensaje: "Pago registrado exitosamente", id: idPago });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const eliminarPago = async (req, res) => {
    try {
        await PagoModelo.eliminar(req.params.id);
        res.json({ mensaje: "Pago eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const obtenerEstadisticas = async (req, res) => {
    try {
        const stats = await PagoModelo.obtenerEstadisticas();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const registrarPagoGlobal = async (req, res) => {
    try {
        const { quincena, fecha } = req.body;
        const totalInsertados = await PagoModelo.crearGlobal({
            quincena,
            fecha: fecha || new Date().toISOString().split('T')[0]
        });
        res.status(201).json({ 
            mensaje: `Se registraron ${totalInsertados} pagos exitosamente`, 
            total: totalInsertados 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const registrarLote = async (req, res) => {
    try {
        const { pagos } = req.body;
        const total = await PagoModelo.crearLote(pagos);
        res.status(201).json({ mensaje: `Se registraron ${total} pagos exitosamente`, total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    obtenerPagos,
    obtenerPagosPorPersona,
    registrarPago,
    eliminarPago,
    obtenerEstadisticas,
    registrarPagoGlobal,
    registrarLote
};
