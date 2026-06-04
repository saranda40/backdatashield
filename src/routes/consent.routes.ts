import { registerConsent, checkConsent } from '../controllers/consent.controller';
import express, { Request, Response, Router } from 'express'
import pool from '../config/db';

const router = Router();

// POST: Registrar cuando un usuario acepta o rechaza en un formulario
router.post('/register', registerConsent);

// GET: Consultar disponibilidad en tiempo real (Filtro de legalidad)
// Uso: /api/consent/check?user_identifier=juan@empresa.cl&purpose=marketing
router.get('/check', checkConsent);

router.post('/policy', async (req: Request, res: Response): Promise<void> => {
  // Obtenemos un cliente específico del pool para manejar la transacción de forma segura
  const client = await pool.connect();
  
  try {
    const { version_code, content } = req.body;
    
    if (!version_code || !content) {
      res.status(400).json({ error: 'Faltan campos obligatorios (version_code, content).' });
      client.release();
      return;
    }

    // Iniciamos la transacción
    await client.query('BEGIN');

    // 1. Desactivamos absolutamente todas las políticas anteriores
   
    const deactivateQuery = `
      UPDATE legal_versions 
      SET is_active = false 
      WHERE is_active = true;
    `;
    await client.query(deactivateQuery);

    // 2. Insertamos la nueva política marcada como activa
    const insertQuery = `
      INSERT INTO legal_versions (version_code, content, is_active)
      VALUES ($1, $2, $3)
      RETURNING id, version_code, is_active, created_at;
    `;
    const result = await client.query(insertQuery, [
      version_code.trim(), 
      content.trim()
    ]);

    // Confirmamos los cambios en la base de datos de manera atómica
    await client.query('COMMIT');

    res.status(201).json({
      message: 'Nueva política legal indexada y activada como global única.',
      data: result.rows[0]
    });

  } catch (error: any) {
    // Si algo falla, revertimos cualquier cambio para mantener la consistencia
    await client.query('ROLLBACK');
    console.error('Error en la transacción de política legal:', error);
    res.status(500).json({ error: 'Error interno al procesar y activar la política legal.' });
  } finally {
    // Muy importante: liberamos el cliente de vuelta al pool
    client.release();
  }
});

router.get('/active-policy', async (req: Request, res: Response): Promise<void> => {
  try {
    const query = `
      SELECT version_code, content
      FROM legal_versions 
      WHERE is_active = true 
      LIMIT 1;
    `;
    const result = await pool.query(query);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No hay ninguna política activa en el sistema.' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar la política activa.' });
  }
});

export default router;