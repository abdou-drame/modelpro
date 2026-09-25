import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { requireCompany } from '../middlewares/tenantMiddleware';
import { createTicket, listMyTickets, getMyTicket, replyMyTicket } from '../controllers/supportController';

const router = Router();

// Pas de enforceSubscription ici : une entreprise suspendue/expirée doit pouvoir contacter le
// support. Tout membre de l'entreprise peut ouvrir et suivre les tickets de son entreprise.
router.use(protect, requireCompany);

router.post('/tickets', createTicket);
router.get('/tickets', listMyTickets);
router.get('/tickets/:id', getMyTicket);
router.post('/tickets/:id/messages', replyMyTicket);

export default router;
