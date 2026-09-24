const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// GET /api/estudiantes -> lista todos los estudiantes con sus misiones y estado
// GET /api/estudiantes/:carnet -> detalle de un solo estudiante
router.get('/:carnet?', async (req, res) => {
  try {
    const pool = await getPool();
    const { carnet } = req.params;

    const request = pool.request();
    let filtro = '';
    if (carnet) {
      request.input('carnet', carnet);
      filtro = 'WHERE e.Carnet = @carnet';
    }

    const result = await request.query(`
      SELECT
        e.Carnet AS carnet, e.Nombre AS nombre, e.Correo AS correo,
        m.MisionID AS misionId, m.Nombre AS misionNombre,
        em.Estado AS estado
      FROM Estudiantes e
      LEFT JOIN EstudianteMisiones em ON em.Carnet = e.Carnet
      LEFT JOIN Misiones m ON m.MisionID = em.MisionID
      ${filtro}
      ORDER BY e.Carnet, m.MisionID
    `);

    // Agrupar filas planas en { carnet, nombre, correo, misiones: [...] }
    const estudiantesMap = new Map();
    for (const row of result.recordset) {
      if (!estudiantesMap.has(row.carnet)) {
        estudiantesMap.set(row.carnet, {
          carnet: row.carnet,
          nombre: row.nombre,
          correo: row.correo,
          misiones: []
        });
      }
      if (row.misionId !== null) {
        estudiantesMap.get(row.carnet).misiones.push({
          misionId: row.misionId,
          nombre: row.misionNombre,
          estado: !!row.estado
        });
      }
    }

    const estudiantes = Array.from(estudiantesMap.values()).map((e) => {
      const completadas = e.misiones.filter((m) => m.estado).length;
      return { ...e, totalMisiones: e.misiones.length, misionesCompletadas: completadas };
    });

    if (carnet) {
      if (estudiantes.length === 0) {
        return res.status(404).json({ ok: false, error: 'Estudiante no encontrado.' });
      }
      return res.json({ ok: true, estudiante: estudiantes[0] });
    }

    res.json({ ok: true, estudiantes });
  } catch (err) {
    console.error('Error en /api/estudiantes:', err);
    res.status(500).json({ ok: false, error: 'Error interno del servidor.', detalle: err.message });
  }
});

module.exports = router;
