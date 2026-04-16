const BancoModelo = require('../modelo/BancoModelo');

class BancoControlador {

    // GET /api/banco/fondo-global
    static async obtenerFondoGlobal(req, res) {
        try {
            const data = await BancoModelo.obtenerFondoGlobal();
            res.json(data);
        } catch (err) {
            console.error('Error obtenerFondoGlobal:', err);
            res.status(500).json({ error: err.message });
        }
    }

    // GET /api/banco/resumen-maestro
    static async obtenerResumenMaestro(req, res) {
        try {
            const data = await BancoModelo.obtenerResumenMaestro();
            res.json(data);
        } catch (err) {
            console.error('Error obtenerResumenMaestro:', err);
            res.status(500).json({ error: err.message });
        }
    }
}

module.exports = BancoControlador;
