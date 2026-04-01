const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Configuración de variables de entorno
dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Importación de Rutas
const personasRoutes     = require("./vista/PersonasVista");
const pagosRoutes        = require("./vista/PagosVista");
const metasRoutes        = require("./vista/MetasVista");
const alcantarillaRoutes = require("./vista/AlcantarillaVista");

// Definición de Rutas (Endpoints)
app.use("/api/personas",      personasRoutes);
app.use("/api/pagos",         pagosRoutes);
app.use("/api/metas",         metasRoutes);
app.use("/api/alcantarillas", alcantarillaRoutes);

// Puerto
const PORT = process.env.PORT || 2014;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});