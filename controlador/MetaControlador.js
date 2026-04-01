const MetasModelo = require('../modelo/MetasModelo');

const crearMeta = async (req, res) => {
    try {
        const id = await MetasModelo.crear(req.body);
        res.status(201).json({ mensaje: "Meta creada", id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const obtenerMetas = async (req, res) => {
    try {
        const metas = await MetasModelo.obtenerTodas();
        res.json(metas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const actualizarMeta = async (req, res) => {
    try {
        await MetasModelo.actualizar(req.params.id, req.body);
        res.json({ mensaje: "Meta actualizada" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const eliminarMeta = async (req, res) => {
    try {
        await MetasModelo.eliminar(req.params.id);
        res.json({ mensaje: "Meta eliminada" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const obtenerEstadisticasMetas = async (req, res) => {
    try {
        const stats = await MetasModelo.obtenerEstadisticasMetas();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    crearMeta,
    obtenerMetas,
    actualizarMeta,
    eliminarMeta,
    obtenerEstadisticasMetas
};
