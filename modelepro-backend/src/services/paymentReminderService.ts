import { Op } from 'sequelize';
import { Invoice } from '../models/Invoice';
import { User } from '../models/User';
import { createNotification } from './notificationService';
import { sendEmail } from './emailService';
import { hasFeature, PLAN_FEATURE_KEYS } from './subscriptionService';

const JOUR_MS = 24 * 60 * 60 * 1000;

// Système NATIF de suivi des paiements Naatalix (décision de la direction ATAABA, 2026-09-23 :
// Naatalix doit fonctionner de façon autonome, sans dépendre de PayTrack — voir JOURNAL.md).
// Complète les indicateurs déjà en place (Dashboard "finance", relevé client) par des relances
// automatiques, sur le même principe que subscriptionService.runSubscriptionMaintenance :
//   - à J-3 avant l'échéance d'une facture non soldée : rappel préventif (une seule fois) ;
//   - le jour où elle passe en retard (échéance dépassée, toujours non soldée) : alerte de retard
//     (une seule fois) — cahier des charges F-017 "Alerter sur échéances, impayés".
// N'agit que sur les factures envoyées et non entièrement payées ; ignore brouillons/annulées/avoirs.
const notifyCompanyFinance = async (companyId: number, titre: string, description: string, referenceId?: number): Promise<void> => {
  const recipients = await User.findAll({ where: { companyId, companyRole: { [Op.in]: ['admin', 'finance'] }, statut: 'actif' } });
  for (const user of recipients) {
    await createNotification(user.id, 'paiement', titre, description, referenceId);
    if (user.email) await sendEmail(user.email, titre, description);
  }
};

// Relances "manuelles" (Essentiel) vs "assistées"/"automatisées" (Pro/Business) — cahier
// NAATALIX_Formules_Fonctionnalites.docx, 2026-09-24. Le canal e-mail existe désormais
// (emailService.ts, construit le 2026-09-25 pour l'OTP puis réutilisé ici) : les deux paliers
// payants envoient la même alerte, in-app + e-mail, au service Finance de l'entreprise — pas
// encore de relance envoyée directement au client final (SMS/WhatsApp, toujours en option non
// construite). L'Essentiel n'a droit à aucune relance automatique (feature absente de son plan),
// le suivi y reste manuel comme prévu au cahier.
export const runPaymentReminders = async (now = new Date()): Promise<{ upcoming: number; overdue: number }> => {
  let upcoming = 0;
  let overdue = 0;

  const candidates = await Invoice.findAll({
    where: {
      type: 'facture',
      statut: 'envoyee',
      paymentStatus: { [Op.ne]: 'payee' },
      dateEcheance: { [Op.ne]: null },
    },
  });

  const featureByCompany = new Map<number, boolean>();
  const companyAllowed = async (companyId: number): Promise<boolean> => {
    if (!featureByCompany.has(companyId)) {
      featureByCompany.set(companyId, await hasFeature(companyId, PLAN_FEATURE_KEYS.RELANCES_ASSISTEES));
    }
    return featureByCompany.get(companyId)!;
  };

  for (const invoice of candidates) {
    if (!(await companyAllowed(invoice.companyId))) continue;
    const echeance = new Date(invoice.dateEcheance!);
    const joursRestants = Math.ceil((echeance.getTime() - now.getTime()) / JOUR_MS);

    if (joursRestants === 3 && !invoice.rappelEcheanceEnvoye) {
      await notifyCompanyFinance(
        invoice.companyId,
        'Échéance de facture dans 3 jours',
        `La facture ${invoice.numero} (solde restant : ${invoice.soldeRestant} FCFA) arrive à échéance le ${echeance.toLocaleDateString('fr-FR')}.`,
        invoice.id
      );
      invoice.rappelEcheanceEnvoye = true;
      await invoice.save();
      upcoming += 1;
    } else if (joursRestants < 0 && !invoice.alerteRetardEnvoyee) {
      await notifyCompanyFinance(
        invoice.companyId,
        'Facture en retard de paiement',
        `La facture ${invoice.numero} (solde restant : ${invoice.soldeRestant} FCFA) est en retard depuis le ${echeance.toLocaleDateString('fr-FR')}.`,
        invoice.id
      );
      invoice.alerteRetardEnvoyee = true;
      await invoice.save();
      overdue += 1;
    }
  }

  return { upcoming, overdue };
};
