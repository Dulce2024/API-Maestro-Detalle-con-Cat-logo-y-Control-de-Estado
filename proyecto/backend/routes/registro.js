const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

/**
 * POST /api/registro
 * Body esperado:
 * {
 *   "maestro": { "carnet": "...", "nombre": "...", "correo": "..." },
 *   "detalle": [ { "misionId": 1, "estado": true }, ... ]
 * }
 *
 * Nota sobre nombres de columnas reales (ERD):
 *   Estudiantes(Carnet, Nombre, Correo)
 *   Misiones(MisionID, Nombre, Descripcion)
 *   EstudianteMisiones(DetalleID PK identity, Carnet, MisionID, Estado, FechaRegistro)
 *     con UNIQUE(Carnet, MisionID) -> esa es la clave real para el upsert del detalle.
 */
router.post('/', async (req, res) => {
  const { maestro, detalle } = req.body || {};

  // --- Validación básica de entrada ---
  if (!maestro || !maestro.carnet || !maestro.nombre || !maestro.correo) {
    return res.status(400).json({
      ok: false,
      error: 'El objeto "maestro" debe incluir carnet, nombre y correo.'
    });
  }
  if (!Array.isArray(detalle)) {
    return res.status(400).json({
      ok: false,
      error: 'El campo "detalle" debe ser un arreglo de misiones.'
    });
  }

  const { carnet, nombre, correo } = maestro;

  try {
    const pool = await getPool();

    // --- 1. Validar que todos los misionId existan en el catálogo Misiones ---
    const idsUnicos = [...new Set(detalle.map((d) => d.misionId))];
    if (idsUnicos.length > 0) {
      const catalogoResult = await pool.request().query(`SELECT MisionID FROM Misiones`);
      const idsValidos = new Set(catalogoResult.recordset.map((r) => r.MisionID));
      const idsInvalidos = idsUnicos.filter((id) => !idsValidos.has(id));

      if (idsInvalidos.length > 0) {
        return res.status(400).json({
          ok: false,
          error: 'Error de referencia: los siguientes misionId no existen en el catálogo Misiones.',
          misionesInvalidas: idsInvalidos
        });
      }
    }

    // --- 2 y 3: Transacción para upsert de estudiante + detalle ---
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Upsert Estudiantes (MERGE por Carnet = PK)
      // Nota: Nombre y Correo tienen UNIQUE en el ERD. Si otro carnet ya usa
      // ese mismo nombre o correo, SQL Server devolverá un error de violación
      // de restricción única, que capturamos abajo como error 409.
      const reqEstudiante = new sql.Request(transaction);
      reqEstudiante.input('carnet', sql.VarChar(25), carnet);
      reqEstudiante.input('nombre', sql.NVarChar(150), nombre);
      reqEstudiante.input('correo', sql.NVarChar(150), correo);

      await reqEstudiante.query(`
        MERGE Estudiantes AS target
        USING (SELECT @carnet AS Carnet) AS source
        ON target.Carnet = source.Carnet
        WHEN MATCHED THEN
          UPDATE SET Nombre = @nombre, Correo = @correo
        WHEN NOT MATCHED THEN
          INSERT (Carnet, Nombre, Correo) VALUES (@carnet, @nombre, @correo);
      `);

      // Upsert de cada mision en el detalle, usando UNIQUE(Carnet, MisionID)
      for (const item of detalle) {
        const reqDetalle = new sql.Request(transaction);
        reqDetalle.input('carnet', sql.VarChar(25), carnet);
        reqDetalle.input('misionId', sql.Int, item.misionId);
        reqDetalle.input('estado', sql.Bit, !!item.estado);

        await reqDetalle.query(`
          MERGE EstudianteMisiones AS target
          USING (SELECT @carnet AS Carnet, @misionId AS MisionID) AS source
          ON target.Carnet = source.Carnet AND target.MisionID = source.MisionID
          WHEN MATCHED THEN
            UPDATE SET Estado = @estado, FechaRegistro = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (Carnet, MisionID, Estado) VALUES (@carnet, @misionId, @estado);
        `);
      }

      await transaction.commit();

      return res.status(200).json({
        ok: true,
        mensaje: 'Registro procesado correctamente.',
        carnet,
        misionesProcesadas: detalle.length
      });
    } catch (errTx) {
      await transaction.rollback();
      throw errTx;
    }
  } catch (err) {
    console.error('Error en /api/registro:', err);

    // Violación de restricción UNIQUE (Nombre/Correo duplicados en otro carnet)
    if (err.number === 2627 || err.number === 2601) {
      return res.status(409).json({
        ok: false,
        error: 'Conflicto: el nombre o correo ya está registrado con otro carnet distinto.'
      });
    }

    return res.status(500).json({ ok: false, error: 'Error interno del servidor.', detalle: err.message });
  }
});

module.exports = router;
