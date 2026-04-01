const PersonaModelo = require('../modelo/PersonasModelo');
const PagoModelo = require('../modelo/PagoModelo');
const { calcularEstado } = require('../logic/cuotasLogic');

const obtenerPersonas = async (req, res) => {
    try {
        const personas = await PersonaModelo.obtenerTodos();
        const personasConEstado = await Promise.all(personas.map(async (p) => {
            const pagos = await PagoModelo.obtenerPorPersona(p.id);
            const estado = calcularEstado(p, pagos);
            return { ...p, ...estado };
        }));
        res.json(personasConEstado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const obtenerPersonaPorId = async (req, res) => {
    try {
        const persona = await PersonaModelo.obtenerPorId(req.params.id);
        if (!persona) return res.status(404).json({ error: "Persona no encontrada" });

        const pagos = await PagoModelo.obtenerPorPersona(persona.id);
        const estado = calcularEstado(persona, pagos);

        res.json({ ...persona, ...estado, pagos });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const crearPersona = async (req, res) => {
    try {
        const data = {
            ...req.body,
            fecha_ingreso: req.body.fecha_ingreso || new Date().toISOString().split('T')[0]
        };
        const id = await PersonaModelo.crear(data);
        res.status(201).json({ id, ...data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const crearPersonasMasivo = async (req, res) => {
    try {
        const personas = req.body; // Array of objects
        if (!Array.isArray(personas)) return res.status(400).json({ error: "Se espera un array de personas" });

        const resultados = [];
        for (const p of personas) {
            const id = await PersonaModelo.crear({
                ...p,
                fecha_ingreso: p.fecha_ingreso || new Date().toISOString().split('T')[0]
            });
            resultados.push({ id, ...p });
        }
        res.status(201).json(resultados);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const actualizarPersona = async (req, res) => {
    try {
        await PersonaModelo.actualizar(req.params.id, req.body);
        res.json({ mensaje: "Persona actualizada correctamente" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const eliminarPersona = async (req, res) => {
    try {
        await PersonaModelo.eliminar(req.params.id);
        res.json({ mensaje: "Persona eliminada correctamente" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    obtenerPersonas,
    obtenerPersonaPorId,
    crearPersona,
    crearPersonasMasivo,
    actualizarPersona,
    eliminarPersona
};