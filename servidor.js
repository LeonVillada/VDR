const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Configuración de variables de entorno
dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Importación de Rutas
const personasRoutes     = require("./vista/PersonasVista");
const pagosRoutes        = require("./vista/PagosVista");
const metasRoutes        = require("./vista/MetasVista");
const alcantarillaRoutes = require("./vista/AlcantarillaVista");
const prestamosRoutes    = require("./vista/PrestamoVista");
const bancoRoutes        = require("./vista/BancoVista");
const GastosControlador = require('./controlador/GastosControlador');
const fondosControlador = require('./controlador/FondosControlador');
const fondosEspecificosControlador = require('./controlador/FondosEspecificosControlador');

// Definición de Rutas (Endpoints)
app.use("/api/personas",      personasRoutes);
app.use("/api/pagos",         pagosRoutes);
app.use("/api/metas",         metasRoutes);
app.use("/api/alcantarillas", alcantarillaRoutes);
app.use("/api/prestamos",     prestamosRoutes);
app.use("/api/banco",         bancoRoutes);
app.use("/api/fondos",         fondosControlador);
app.use("/api/fondos-especificos", fondosEspecificosControlador);
app.use('/api/gastos', GastosControlador);

// Puerto
const PORT = process.env.PORT || 2014;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});