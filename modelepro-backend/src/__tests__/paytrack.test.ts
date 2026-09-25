import crypto from 'crypto';
import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { PaytrackTransaction } from '../models/PaytrackTransaction';
import { PaytrackEvent } from '../models/PaytrackEvent';
import { InvoicePayment } from '../models/InvoicePayment';
import { Invoice } from '../models/Invoice';
import { User } from '../models/User';
import { hashPassword } from '../utils/auth';

jest.setTimeout(30000);

const SECRET = 'test-webhook-secret';
let adminToken: string;
let otherToken: string;
let staffToken: string;
let invoiceId: number;

// Le "faux PayTrack" : on remplace fetch (création de la demande de paiement) sans toucher au code
// Naatalix ; les webhooks, eux, sont envoyés pour de vrai à l'API avec une vraie signature HMAC.
const mockFetch = (impl: () => Promise<any>) => {
  (global as any).fetch = jest.fn(impl);
};
const originalFetch = (global as any).fetch;

const sign = (payload: object) => {
  const raw = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
  return { raw, signature };
};
const sendWebhook = (payload: object, signature?: string) => {
  const { raw, signature: valid } = sign(payload);
  return request(app)
    .post('/api/v1/integrations/paytrack/webhook')
    .set('Content-Type', 'application/json')
    .set('x-paytrack-signature', signature ?? valid)
    .send(raw);
};

const createSentInvoice = async (token: string, montant: number) => {
  const cust = await request(app).post('/api/v1/crm/customers').set('Authorization', `Bearer ${token}`).send({ nom: 'Client PayTrack' });
  const inv = await request(app).post('/api/v1/crm/invoices').set('Authorization', `Bearer ${token}`)
    .send({ customerId: cust.body.customer.id, lines: [{ designation: 'Prestation', quantite: 1, prixUnitaire: montant }] });
  await request(app).patch(`/api/v1/crm/invoices/${inv.body.id}/send`).set('Authorization', `Bearer ${token}`);
  return inv.body.id as number;
};

const initiate = async (id: number, body: object = {}) =>
  request(app).post(`/api/v1/crm/invoices/${id}/paytrack/pay`).set('Authorization', `Bearer ${adminToken}`).send(body);

beforeAll(async () => {
  process.env.PAYTRACK_API_URL = 'https://paytrack.test/api';
  process.env.PAYTRACK_API_KEY = 'key';
  process.env.PAYTRACK_WEBHOOK_SECRET = SECRET;
  await sequelize.sync({ force: true });

  const a = await request(app).post('/api/v1/companies/register').send({ companyNom: 'PT A', nom: 'A', prenom: 'A', telephone: '795000001', password: 'password' });
  adminToken = a.body.token;
  const b = await request(app).post('/api/v1/companies/register').send({ companyNom: 'PT B', nom: 'B', prenom: 'B', telephone: '795000002', password: 'password' });
  otherToken = b.body.token;

  await User.create({ nom: 'S', prenom: 'S', telephone: '700000009', password: await hashPassword('MotDePasse-Staff-1'), role: 'ataaba_staff', statut: 'actif', platformRole: 'support' });
  staffToken = (await request(app).post('/api/v1/auth/login').send({ telephone: '700000009', password: 'MotDePasse-Staff-1' })).body.token;

  invoiceId = await createSentInvoice(adminToken, 100000);
}, 60000);

afterAll(async () => {
  (global as any).fetch = originalFetch;
  delete process.env.PAYTRACK_API_URL;
  delete process.env.PAYTRACK_API_KEY;
  delete process.env.PAYTRACK_WEBHOOK_SECRET;
  await sequelize.close();
});

describe('PayTrack — Naatalix fonctionne sans, activation optionnelle', () => {
  it('le règlement manuel fonctionne sans aucune configuration PayTrack (critère C1)', async () => {
    const res = await request(app).post(`/api/v1/crm/invoices/${invoiceId}/payments`).set('Authorization', `Bearer ${adminToken}`).send({ montant: 1000 });
    expect(res.status).toBe(201);
    // remet la facture à son état initial pour la suite
    await InvoicePayment.destroy({ where: { invoiceId } });
    const inv = await Invoice.findByPk(invoiceId);
    inv!.montantPaye = 0; inv!.soldeRestant = inv!.totalTTC; inv!.paymentStatus = 'impayee'; await inv!.save();
  });

  it('refuse d’initier un paiement si PayTrack n’est pas activé pour l’entreprise (403)', async () => {
    const res = await initiate(invoiceId);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PAYTRACK_DISABLED');
  });

  it('refuse (503) si la plateforme n’a pas de configuration PayTrack', async () => {
    const saved = process.env.PAYTRACK_API_KEY;
    delete process.env.PAYTRACK_API_KEY;
    const res = await initiate(invoiceId);
    process.env.PAYTRACK_API_KEY = saved;
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('PAYTRACK_NOT_CONFIGURED');
  });

  it('l’admin active PayTrack pour son entreprise', async () => {
    const res = await request(app).put('/api/v1/companies/me').set('Authorization', `Bearer ${adminToken}`).send({ paytrackActif: true });
    expect(res.status).toBe(200);
    expect(res.body.paytrackActif).toBe(true);
  });
});

describe('PayTrack — initiation du paiement', () => {
  it('transmet montant/devise/référence à PayTrack et enregistre la référence externe', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ id: 'PT-123', payment_url: 'https://pay.paytrack.test/PT-123' }) }));
    const res = await initiate(invoiceId, { montant: 40000 });
    expect(res.status).toBe(201);
    expect(res.body.statut).toBe('initie');
    expect(res.body.externalReference).toBe('PT-123');
    expect(res.body.paymentUrl).toBe('https://pay.paytrack.test/PT-123');

    const call = (global as any).fetch.mock.calls[0];
    expect(call[0]).toBe('https://paytrack.test/api/payments');
    const sent = JSON.parse(call[1].body);
    expect(sent).toMatchObject({ amount: 40000, currency: 'FCFA' });
    expect(sent.reference).toMatch(/^NTX-/);
    expect(call[1].headers.Authorization).toBe('Bearer key');
  });

  it('refuse un montant supérieur au solde restant', async () => {
    const res = await initiate(invoiceId, { montant: 999999 });
    expect(res.status).toBe(400);
  });

  it('marque la transaction échouée et répond 502 si PayTrack est indisponible', async () => {
    mockFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    const res = await initiate(invoiceId, { montant: 1000 });
    expect(res.status).toBe(502);
    expect(await PaytrackTransaction.count({ where: { invoiceId, statut: 'echoue' } })).toBe(1);
  });

  it('isolation : une autre entreprise ne peut pas initier ni lister les paiements de cette facture', async () => {
    await request(app).put('/api/v1/companies/me').set('Authorization', `Bearer ${otherToken}`).send({ paytrackActif: true });
    const res = await request(app).post(`/api/v1/crm/invoices/${invoiceId}/paytrack/pay`).set('Authorization', `Bearer ${otherToken}`).send({});
    expect(res.status).toBe(404);
    expect((await request(app).get(`/api/v1/crm/invoices/${invoiceId}/paytrack`).set('Authorization', `Bearer ${otherToken}`)).status).toBe(404);
  });
});

describe('PayTrack — webhook signé et idempotent (critère F-010)', () => {
  let reference: string;
  beforeAll(async () => {
    const tx = await PaytrackTransaction.findOne({ where: { invoiceId, statut: 'initie' } });
    reference = tx!.referenceInterne;
  });

  it('rejette une signature invalide (401) sans rien modifier', async () => {
    const res = await sendWebhook({ event_id: 'e0', type: 'payment.succeeded', reference, amount: 40000, currency: 'FCFA' }, 'deadbeef');
    expect(res.status).toBe(401);
    expect(await InvoicePayment.count({ where: { invoiceId } })).toBe(0);
  });

  it('rejette une requête sans signature', async () => {
    const res = await request(app).post('/api/v1/integrations/paytrack/webhook').send({ event_id: 'e0', type: 'payment.succeeded' });
    expect(res.status).toBe(401);
  });

  it('un paiement confirmé crée le règlement et recalcule solde et statut', async () => {
    const res = await sendWebhook({ event_id: 'evt-1', type: 'payment.succeeded', reference, transaction_id: 'PT-123', amount: 40000, currency: 'FCFA' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('traite');

    const inv = await Invoice.findByPk(invoiceId);
    expect(inv!.montantPaye).toBe(40000);
    expect(inv!.soldeRestant).toBeCloseTo(60000, 5);
    expect(inv!.paymentStatus).toBe('partiellement_payee');
    const tx = await PaytrackTransaction.findOne({ where: { referenceInterne: reference } });
    expect(tx!.statut).toBe('confirme');
    expect(tx!.invoicePaymentId).not.toBeNull();
  });

  it('le même événement rejoué n’applique jamais deux fois le règlement (idempotence)', async () => {
    const res = await sendWebhook({ event_id: 'evt-1', type: 'payment.succeeded', reference, transaction_id: 'PT-123', amount: 40000, currency: 'FCFA' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('deja_traite');
    expect(await InvoicePayment.count({ where: { invoiceId } })).toBe(1);
  });

  it('un nouvel événement pour une transaction déjà confirmée est ignoré (seconde barrière)', async () => {
    const res = await sendWebhook({ event_id: 'evt-2', type: 'payment.succeeded', reference, amount: 40000, currency: 'FCFA' });
    expect(res.body.status).toBe('ignore');
    expect(await InvoicePayment.count({ where: { invoiceId } })).toBe(1);
  });

  it('deux livraisons simultanées du même événement produisent un seul règlement', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ id: 'PT-200', payment_url: 'https://pay.test/200' }) }));
    const created = await initiate(invoiceId, { montant: 10000 });
    const ref = created.body.referenceInterne;
    const payload = { event_id: 'evt-race', type: 'payment.succeeded', reference: ref, amount: 10000, currency: 'FCFA' };
    await Promise.all([sendWebhook(payload), sendWebhook(payload)]);
    expect(await InvoicePayment.count({ where: { invoiceId, montant: 10000 } })).toBe(1);
    expect(await PaytrackEvent.count({ where: { eventId: 'evt-race' } })).toBe(1);
  });

  it('un montant incohérent est journalisé en anomalie et n’applique aucun règlement', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ id: 'PT-300', payment_url: 'https://pay.test/300' }) }));
    const created = await initiate(invoiceId, { montant: 5000 });
    const before = await InvoicePayment.count({ where: { invoiceId } });
    const res = await sendWebhook({ event_id: 'evt-bad-amount', type: 'payment.succeeded', reference: created.body.referenceInterne, amount: 99999, currency: 'FCFA' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('anomalie');
    expect(await InvoicePayment.count({ where: { invoiceId } })).toBe(before);
  });

  it('une référence inconnue est journalisée en anomalie (200, pas de relance infinie)', async () => {
    const res = await sendWebhook({ event_id: 'evt-unknown', type: 'payment.succeeded', reference: 'NTX-INCONNUE', amount: 1, currency: 'FCFA' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('anomalie');
  });

  it('un paiement échoué marque la transaction échouée sans règlement', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ id: 'PT-400', payment_url: 'https://pay.test/400' }) }));
    const created = await initiate(invoiceId, { montant: 2000 });
    const res = await sendWebhook({ event_id: 'evt-fail', type: 'payment.failed', reference: created.body.referenceInterne });
    expect(res.body.status).toBe('traite');
    const tx = await PaytrackTransaction.findOne({ where: { referenceInterne: created.body.referenceInterne } });
    expect(tx!.statut).toBe('echoue');
  });

  it('le paiement du solde restant termine le recalcul (facture payée)', async () => {
    const inv = await Invoice.findByPk(invoiceId);
    mockFetch(async () => ({ ok: true, json: async () => ({ id: 'PT-500', payment_url: 'https://pay.test/500' }) }));
    const created = await initiate(invoiceId, {});
    expect(created.body.montant).toBeCloseTo(inv!.soldeRestant, 5);
    await sendWebhook({ event_id: 'evt-final', type: 'payment.succeeded', reference: created.body.referenceInterne, amount: inv!.soldeRestant, currency: 'FCFA' });
    const after = await Invoice.findByPk(invoiceId);
    expect(after!.paymentStatus).toBe('payee');
    expect(after!.soldeRestant).toBe(0);
  });
});

describe('PayTrack — supervision par le support ATAABA', () => {
  it('le support voit les événements (dont les anomalies) et les transactions', async () => {
    const events = await request(app).get('/api/v1/backoffice/integrations/paytrack/events?statut=anomalie').set('Authorization', `Bearer ${staffToken}`);
    expect(events.status).toBe(200);
    expect(events.body.total).toBe(2);

    const txs = await request(app).get('/api/v1/backoffice/integrations/paytrack/transactions').set('Authorization', `Bearer ${staffToken}`);
    expect(txs.body.total).toBeGreaterThanOrEqual(5);
  });

  it('un compte entreprise ne peut pas consulter la supervision', async () => {
    const res = await request(app).get('/api/v1/backoffice/integrations/paytrack/events').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });
});
