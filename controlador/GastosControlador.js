const express = require('express');
const router = express.Router();
const GastosModelo = require('../modelo/GastosModelo');
const multer = require('multer');
const path = require('path');

// Configuración de Multer para facturas
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });


// Obtener todos los gastos
router.get('/', async (req, res) => {
    try {
        const gastos = await GastosModelo.obtenerTodos();
        res.json(gastos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener los gastos' });
    }
});

// Crear un nuevo gasto
router.post('/', async (req, res) => {
    try {
        const nuevoGasto = req.body;
        const gastoCreado = await GastosModelo.crear(nuevoGasto);
        // Devolvemos gastoId para compatibilidad con el frontend
        res.status(201).json({ ...gastoCreado, gastoId: gastoCreado.id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear el gasto' });
    }
});

// Actualizar un gasto
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const datosActualizados = req.body;
        const gastoActualizado = await GastosModelo.actualizar(id, datosActualizados);
        res.json(gastoActualizado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el gasto' });
    }
});

// Eliminar un gasto
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await GastosModelo.eliminar(id);
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar el gasto' });
    }
});

// Subir facturas para un gasto existente
router.post('/factura', upload.array('factura'), async (req, res) => {
    try {
        const { gastoId } = req.body;
        const archivos = req.files;

        if (!archivos || archivos.length === 0) {
            return res.status(400).json({ error: 'No se subieron archivos' });
        }

        const nombresArchivos = archivos.map(a => a.filename);
        await GastosModelo.agregarImagenes(gastoId, nombresArchivos);
        
        res.json({ message: 'Facturas subidas correctamente', archivos: nombresArchivos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al subir las facturas' });
    }
});


module.exports = router;