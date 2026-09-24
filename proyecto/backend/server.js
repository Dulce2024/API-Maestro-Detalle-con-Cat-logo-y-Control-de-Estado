const express = require('express');
const cors = require('cors');
require('dotenv').config();

const registroRouter = require('./routes/registro');
const misionesRouter = require('./routes/misiones');
const estudiantesRouter = require('./routes/estudiantes');

const app = express();
app.use(cors()); // permite que el frontend (otro dominio) consuma la API
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ ok: true, mensaje: 'API Maestro-Detalle funcionando.' });
});

app.use('/api/registro', registroRouter);
app.use('/api/misiones', misionesRouter);
app.use('/api/estudiantes', estudiantesRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
