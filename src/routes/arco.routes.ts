import { Router } from 'express';
import { createArcoRequest, updateArcoStatus, getArcoRequests } from '../controllers/arco.controller';

const router = Router();

// GET: Obtener todas las solicitudes para auditoría o dashboard interno
router.get('/', getArcoRequests);

// POST: Registrar una nueva solicitud desde un formulario ARCO
router.post('/request', createArcoRequest);

// PATCH: Actualizar el estado del trámite legal (ej: de 'pendiente' a 'en_revision')
router.patch('/status/:id', updateArcoStatus);

export default router;