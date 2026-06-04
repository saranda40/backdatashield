import { Router, Request, Response } from 'express';
import { createArcoRequest, updateArcoStatus, getArcoRequests } from '../controllers/arco.controller';
import { sendComplianceEmail } from '../services/email.service';
import pool from '../config/db';

const router = Router();

// GET: Obtener todas las solicitudes para auditoría o dashboard interno
router.get('/', getArcoRequests);

// POST: Registrar una nueva solicitud desde un formulario ARCO
router.post('/request', createArcoRequest);

// PATCH: Actualizar el estado del trámite legal (ej: de 'pendiente' a 'en_revision')
router.patch('/status/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body; 
    
    // Hardcodeamos temporalmente el ID 1 (Sebastián) hasta que implementemos JWT tokens
    const currentOfficerId = 1; 

    if (!['resuelto', 'rechazado'].includes(status)) {
      res.status(400).json({ error: 'Estado inválido para cierre de caso.' });
      return;
    }

    // 1. Actualizamos la solicitud en PostgreSQL capturando la auditoría del oficial
    const updateQuery = `
      UPDATE arco_requests 
      SET status = $1, 
          resolved_by_officer_id = $2, 
          internal_notes = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, user_identifier, request_type, status;
    `;
    
    const result = await pool.query(updateQuery, [status, currentOfficerId, notes || '', id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Solicitud ARCO no encontrada.' });
      return;
    }

    const requestData = result.rows[0];

    // 2. Mapeo semántico del tipo de derecho para el cuerpo del correo
    const rights: { [key: string]: string } = { 'A': 'Acceso', 'R': 'Rectificación', 'C': 'Cancelación', 'O': 'Oposición' };
    const rightName = rights[requestData.request_type] || requestData.request_type;

    // 3. Redactar plantilla HTML elegante e institucional
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a;">Resolución de Solicitud de Derechos ARCO</h2>
        <p>Estimado(a) usuario(a),</p>
        <p>Le informamos que nuestro departamento legal ha procesado de manera formal su requerimiento sobre protección de datos personales.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Número de Trámite:</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">#${requestData.id}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Derecho Ejercido:</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${rightName}</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Resolución dictada:</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-weight: bold; color: ${status === 'resuelto' ? '#166534' : '#991b1b'};">
              ${status === 'resuelto' ? 'Aprobado / Resuelto' : 'Rechazado'}
            </td>
          </tr>
        </table>
        
        <p style="font-size: 12px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Este es un correo automático auditado por los oficiales del Ministerio de Fe de DataShield Chile. No responda a este mensaje.
        </p>
      </div>
    `;

    // 4. Disparar el correo de forma asíncrona sin bloquear la respuesta HTTP
    sendComplianceEmail({
      to: requestData.user_identifier, // El correo del usuario afectado
      subject: `DataShield Chile - Resolución de Caso #${requestData.id}`,
      html: emailHtml
    });

    // 5. Responder al Frontend de Astro con el nuevo estado auditado
    res.json({
      message: 'Caso cerrado con éxito y notificación enviada al solicitante.',
      data: requestData
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el estado legal y procesar la auditoría.' });
  }
});

export default router;