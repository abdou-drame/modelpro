import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { requireCompany } from '../middlewares/tenantMiddleware';
import { getDashboard } from '../controllers/dashboardController';

const router = Router();

// Lecture ouverte à tout membre de l'entreprise (y compris readonly) — n'expose que des
// agrégats déjà accessibles individuellement via les modules CRM/ERP/Stocks/Rentabilité.
// Le tableau de bord "CA/ventes" de base est disponible dès l'Essentiel (cahier
// NAATALIX_Formules_Fonctionnalites.docx, 2026-09-24) ; les sections avancées et le reporting par
// utilisateur sont filtrés à l'intérieur de getDashboard selon le plan de l'entreprise.
router.get('/', protect, requireCompany, getDashboard);

export default router;
