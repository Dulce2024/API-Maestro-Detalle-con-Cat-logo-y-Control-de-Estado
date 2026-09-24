const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// GET /api/misiones -> lista el catálogo completo de misiones
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT MisionID AS misionId, Nombre AS nombre, Descripcion AS descripcion
      FROM Misiones
      ORDER BY MisionID
    `);
    res.json({ ok: true, misiones: result.recordset });
  } catch (err) {
    console.error('Error en /api/misiones:', err);
    res.status(500).json({ ok: false, error: 'Error interno del servidor.', detalle: err.message });
  }
});

module.exports = router;
