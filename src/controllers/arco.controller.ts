import { Request, Response } from 'express';
import { query } from '../config/db';

// Tipos estrictos para asegurar el cumplimiento normativo
export type ArcoType = 'A' | 'R' | 'C' | 'O';
export type ArcoStatus = 'pendiente' | 'en_revision' | 'resuelto' | 'rechazado';

export interface ArcoInput {
  user_identifier: string;
  request_type: ArcoType;
  details: string;
  origin: string;
}

/**
 * 1. Crear una nueva solicitud ARCO
 * Registra la petición del usuario desde el formulario web de derechos o soporte.
 */
export const createArcoRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_identifier, request_type, details, origin }: ArcoInput = req.body;

    // Validar parámetros obligatorios
    if (!user_identifier || !request_type || !details || !origin) {
      res.status(400).json({ error: 'Faltan campos obligatorios para registrar la solicitud ARCO.' });
      return;
    }

    // Validar que el tipo de derecho sea correcto (A, R, C o O)
    const validTypes: ArcoType[] = ['A', 'R', 'C', 'O'];
    if (!validTypes.includes(request_type)) {
      res.status(400).json({ error: 'Tipo de derecho ARCO inválido. Debe ser A, R, C u O.' });
      return;
    }

    const insertQuery = `
      INSERT INTO arco_requests (user_identifier, request_type, details, origin)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_identifier, request_type, status, origin, created_at;
    `;

    const result = await query(insertQuery, [
      user_identifier.toLowerCase().trim(),
      request_type,
      details,
      origin
    ]);

    res.status(201).json({
      message: 'Solicitud de derecho ARCO ingresada correctamente.',
      data: result.rows[0]
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al procesar solicitud ARCO', details: error.message });
  }
};

/**
 * 2. Actualizar el estado de una solicitud ARCO
 * Permite a los oficiales de cumplimiento o administradores cambiar el flujo
 * e incluir la fecha de resolución legal.
 */
export const updateArcoStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status }: { status: ArcoStatus } = req.body;

    const validStatuses: ArcoStatus[] = ['pendiente', 'en_revision', 'resuelto', 'rechazado'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: 'Estado ARCO inválido o no proporcionado.' });
      return;
    }

    // Si el estado pasa a cerrado ('resuelto' o 'rechazado'), estampamos el timestamp de resolución
    const isClosed = status === 'resuelto' || status === 'rechazado';
    const updateQuery = `
      UPDATE arco_requests
      SET status = $1, resolved_at = $2
      WHERE id = $3
      RETURNING id, user_identifier, request_type, status, created_at, resolved_at;
    `;

    const resolvedAt = isClosed ? new Date() : null;
    const result = await query(updateQuery, [status, resolvedAt, id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No se encontró la solicitud ARCO especificada.' });
      return;
    }

    res.json({
      message: `Estado de la solicitud actualizado a: ${status}`,
      data: result.rows[0]
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar el estado ARCO', details: error.message });
  }
};

/**
 * 3. Listar solicitudes ARCO (Panel de Control Interno)
 * Endpoint de utilidad para el dashboard que crearemos más adelante.
 */
export const getArcoRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const selectQuery = `
      SELECT id, user_identifier, request_type, details, status, origin, created_at, resolved_at 
      FROM arco_requests 
      ORDER BY created_at DESC;
    `;
    const result = await query(selectQuery);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener listado ARCO', details: error.message });
  }
};