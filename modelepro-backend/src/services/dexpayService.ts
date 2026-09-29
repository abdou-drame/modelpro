import crypto from 'crypto';

// Client DexPay — facturation des abonnements Naatalix (guide de mise en place fourni par
// l'utilisateur, 2026-09-25). Comme pour PayTrack (paytrackService.ts), tout ce qui dépend du
// format réel de l'API est isolé ici : le reste de Naatalix ne connaît pas DexPay directement.
//
// Deux types de clés, deux façons de s'authentifier (d'après le guide) :
//  - x-api-secret (DEXPAY_SECRET_KEY) : /products, /customers, /subscriptions,
//    /subscriptions/{id}/cancel — JAMAIS appelés depuis un frontend, uniquement server-side.
//  - x-api-key (DEXPAY_PUBLIC_KEY) : /checkout-sessions/{reference}, /payment-providers.
// Le champ webhook_url des requêtes de création n'est pas pris en compte par DexPay (confirmé par
// l'utilisateur en testant) : la destination du webhook se configure uniquement, une fois pour
// toutes, dans leur tableau de bord marchand.

export const isDexpayConfigured = (): boolean =>
  Boolean(process.env.DEXPAY_BASE_URL && process.env.DEXPAY_PUBLIC_KEY && process.env.DEXPAY_SECRET_KEY);

const baseUrl = (): string => (process.env.DEXPAY_BASE_URL || '').replace(/\/+$/, '');
// L'environnement sandbox (api-sandbox.dexpay.africa) renvoie une URL de paiement dédiée
// (sandbox_payment_url) distincte de celle de prod (payment_url) — voir createSubscription.
const isSandbox = (): boolean => baseUrl().includes('sandbox');

// Toutes les réponses DexPay enveloppent le contenu utile sous une clé `data` (confirmé contre un
// vrai sandbox DexPay, 2026-09-25) — `secretRequest` la déballe une fois pour toutes, chaque
// appelant reçoit directement l'objet utile (ex. { id } pour /products et /customers).
const secretRequest = async (path: string, body: object): Promise<any> => {
  const response = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-secret': process.env.DEXPAY_SECRET_KEY! },
    body: JSON.stringify(body),
  });
  const raw: any = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`DexPay a répondu ${response.status}${raw?.message ? ` : ${raw.message}` : ''}`);
  }
  return raw?.data ?? raw;
};

// --- Mise en place initiale (une seule fois, voir src/scripts/setupDexpayProducts.ts) ---
export interface CreateProductInput { name: string; billingPeriod: 'monthly' | 'yearly'; price: number; currency: string; }
export const createProduct = async (input: CreateProductInput): Promise<{ id: string }> => {
  const data = await secretRequest('/products', {
    name: input.name, type: 'recurring', billing_period: input.billingPeriod, price: input.price, currency: input.currency,
  });
  if (!data?.id) throw new Error('Réponse DexPay invalide (id manquant) lors de la création du produit.');
  return { id: String(data.id) };
};

// L'id du produit DexPay pour une formule/cycle donné vit dans une variable d'environnement par
// produit (DEXPAY_PRODUCT_<PLAN>_<PERIODE>) — DexPay ne permet pas de relister les produits créés
// par nom après coup (guide), il faut donc noter l'id retourné à la création une fois pour toutes.
export const getProductId = (planCode: string, cycle: 'mensuel' | 'annuel'): string | null => {
  const periode = cycle === 'annuel' ? 'ANNUEL' : 'MENSUEL';
  return process.env[`DEXPAY_PRODUCT_${planCode.toUpperCase()}_${periode}`] || null;
};

// --- Cycle de vie d'un abonnement ---
export interface CreateCustomerInput { name: string; email: string; phone: string; country: string; }
export const createCustomer = async (input: CreateCustomerInput): Promise<{ id: string }> => {
  const data = await secretRequest('/customers', input);
  if (!data?.id) throw new Error('Réponse DexPay invalide (id manquant) lors de la création du client.');
  return { id: String(data.id) };
};

export interface CreateSubscriptionInput { customerId: string; productId: string; metadata: Record<string, unknown>; }
export interface CreateSubscriptionResult { id: string; checkoutUrl: string | null; checkoutSessionId: string | null; }
// Forme réelle confirmée (vérifiée contre le vrai sandbox DexPay, 2026-09-25) — contrairement à
// /products et /customers (id directement sous data.id), /subscriptions imbrique l'id sous
// data.subscription.id, et expose sous data.payment : payment_url (prod), sandbox_payment_url (à
// utiliser en sandbox pour tester réellement) et checkout_session_id.
//
// checkout_session_id est CRITIQUE : le webhook checkout.completed (vérifié contre un vrai
// paiement réussi) n'a NI subscription_id NI les metadata passées ici (DexPay renvoie les
// siennes, ex. merchant_id, pas organization_id/plan/cycle) — seul checkout_session_id permet de
// relier ce webhook à l'abonnement Naatalix. Stocké par l'appelant sur
// CompanySubscription.dexpayCheckoutSessionId (voir dexpayController.findSubscription).
export const createSubscription = async (input: CreateSubscriptionInput): Promise<CreateSubscriptionResult> => {
  const data = await secretRequest('/subscriptions', {
    customer_id: input.customerId, product_id: input.productId, metadata: input.metadata,
  });
  const subscriptionId = data?.subscription?.id;
  if (!subscriptionId) throw new Error('Réponse DexPay invalide (subscription.id manquant) lors de la création de l\'abonnement.');

  const payment = data?.payment ?? {};
  const checkoutUrl = isSandbox()
    ? (payment.sandbox_payment_url || payment.payment_url || null)
    : (payment.payment_url || payment.sandbox_payment_url || null);

  return { id: String(subscriptionId), checkoutUrl, checkoutSessionId: payment.checkout_session_id ? String(payment.checkout_session_id) : null };
};

export const cancelSubscription = async (subscriptionId: string): Promise<void> => {
  await secretRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {});
};

export const listPaymentProviders = async (): Promise<unknown> => {
  const response = await fetch(`${baseUrl()}/payment-providers`, { headers: { 'x-api-key': process.env.DEXPAY_PUBLIC_KEY! } });
  if (!response.ok) throw new Error(`DexPay a répondu ${response.status}`);
  return response.json();
};

// --- Webhook ---
// Signature HMAC-SHA256 (hex) du corps brut, avec la MÊME clé secrète que les appels x-api-secret
// (pas de clé de webhook séparée) — en-tête X-Webhook-Signature.
export const verifyWebhookSignature = (rawBody: Buffer | undefined, signature: string | undefined): boolean => {
  const secret = process.env.DEXPAY_SECRET_KEY;
  if (!secret || !rawBody || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
