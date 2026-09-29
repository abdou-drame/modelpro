import { Site } from '../models/Site';

// Reporting multisite (2026-09-26) — résout le site à associer à un document commercial (devis,
// commande, facture, commande fournisseur) : le site demandé s'il appartient bien à l'entreprise,
// sinon le site principal, sinon le premier site actif trouvé. Ne lève jamais : un document reste
// créable même sans site précis (entreprise mono-site, ou aucun site du tout) — seul le reporting
// par site s'en trouve moins précis, jamais bloquant pour la création du document lui-même.
export const resolveSiteId = async (companyId: number, requestedSiteId?: number | string | null): Promise<number | null> => {
  if (requestedSiteId) {
    const site = await Site.findOne({ where: { id: Number(requestedSiteId), companyId } });
    if (site) return site.id;
  }
  const principal = await Site.findOne({ where: { companyId, estPrincipal: true } });
  if (principal) return principal.id;
  const any = await Site.findOne({ where: { companyId } });
  return any?.id ?? null;
};
