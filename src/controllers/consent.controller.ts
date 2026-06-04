import { Request, Response } from 'express';
import { query } from '../config/db';

// Definimos tipos estrictos basados en las reglas de negocio de DataShield
export type ConsentStatus = 'valido' | 'rechazado' | 'obsoleto' | 'inexistente';

export interface ConsentInput {
  user_identifier: string; // Email, RUT, etc.
  purpose: string;         // 'marketing', 'analytics', etc.
  status: 'valido' | 'rechazado';
  origin: string;          // 'formulario_web', 'crm', etc.
  ip_address?: string;
}

/**
 * REGLA DE ORO 1: Registrar o actualizar consentimiento (Inmutable)
 * No hace UPDATE. Si el usuario cambia su decisión o la política cambia,
 * se inserta una nueva fila. Las anteriores pasan a ser "historial".
 */
export const registerConsent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_identifier, purpose, status, origin, ip_address }: ConsentInput = req.body;

    // 1. Validaciones básicas antes de tocar la base de datos
    if (!user_identifier || !purpose || !status || !origin) {
       res.status(400).json({ error: 'Faltan campos obligatorios para el registro.' });
       return;
    }

    // 2. Obtener la versión legal activa (vigente) en el sistema automáticamente
    const activeVersionQuery = 'SELECT id FROM legal_versions WHERE is_active = true LIMIT 1';
    const versionResult = await query(activeVersionQuery);

    if (versionResult.rows.length === 0) {
       res.status(500).json({ error: 'No hay ninguna política legal activa configurada en DataShield.' });
       return;
    }

    const legalVersionId = versionResult.rows[0].id;

    // 3. Insertar el nuevo registro de consentimiento
    const insertQuery = `
      INSERT INTO consents (user_identifier, legal_version_id, purpose, status, origin, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_identifier, purpose, status, given_at;
    `;
    
    const insertResult = await query(insertQuery, [
      user_identifier.toLowerCase().trim(),
      legalVersionId,
      purpose.toLowerCase().trim(),
      status,
      origin,
      ip_address || req.ip
    ]);

    res.status(201).json({
      message: 'Consentimiento registrado de forma trazable',
      data: insertResult.rows[0]
    });
  } catch (error: any) {
     res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
};

/**
 * REGLA DE ORO 2: El Filtro de Legalidad (Verificación en tiempo real)
 * Los sistemas externos (CRM, scripts de marketing) consultan este endpoint antes de actuar.
 * Devuelve el estado del último consentimiento registrado para ese propósito.
 */
export const checkConsent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_identifier, purpose } = req.query;

    if (!user_identifier || !purpose) {
       res.status(400).json({ error: 'Se requiere user_identifier y purpose como parámetros de búsqueda.' });
       return;
    }

    // Buscamos el último registro para ese usuario y propósito específico (ordenado por fecha descendente)
    const checkQuery = `
      SELECT c.status, c.given_at, lv.version_code, lv.is_active as version_is_active
      FROM consents c
      JOIN legal_versions lv ON c.legal_version_id = lv.id
      WHERE c.user_identifier = $1 AND c.purpose = $2
      ORDER BY c.given_at DESC
      LIMIT 1;
    `;

    const result = await query(checkQuery, [
      (user_identifier as string).toLowerCase().trim(),
      (purpose as string).toLowerCase().trim()
    ]);

    // Caso A: Si no hay registros en el histórico, el estado legal es 'inexistente'
    if (result.rows.length === 0) {
       res.json({
        user_identifier,
        purpose,
        status: 'inexistente',
        allowed: false,
        message: 'No existe registro de consentimiento para este propósito.'
      });
       return;
    }

    const lastConsent = result.rows[0];
    let finalStatus: ConsentStatus = lastConsent.status;

    // Caso B: Si la versión legal asociada al consentimiento ya no está activa,
    // significa que las políticas de la empresa cambiaron y quedó automáticamente 'obsoleto'.
    if (lastConsent.status === 'valido' && !lastConsent.version_is_active) {
      finalStatus = 'obsoleto';
    }

    res.json({
      user_identifier,
      purpose,
      status: finalStatus,
      allowed: finalStatus === 'valido', // Atributo booleano directo para que el CRM decida (true/false)
      version_code: lastConsent.version_code,
      last_updated: lastConsent.given_at
    });
  } catch (error: any) {
     res.status(500).json({ error: 'Error al verificar el consentimiento', details: error.message });
  }
};