import crypto from 'crypto';
import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { CompanySubscription } from '../models/CompanySubscription';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import * as emailService from '../services/emailService';

jest.setTimeout(30000);

const SECRET = 'test-dexpay-secret';
let adminToken: string;
let companyId: number;

// Même principe que paytrack.test.ts : on remplace fetch (appels sortants vers DexPay) sans
// toucher au code Naatalix ; le webhook, lui, est envoyé pour de vrai à l'API avec une vraie
// signature HMAC sur le corps brut exact (JSON.stringify pré-calculé, jamais re-sérialisé par
// supertest, pour que la signature corresponde à ce que le serveur reçoit réellement).
const mockFetch = (impl: (url: string, options: any) => Promise<any>) => {
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
    .post('/api/v1/integrations/dexpay/webhook')
    .set('Content-Type', 'application/json')
    .set('x-webhook-signature', signature ?? valid)
    .send(raw);
};

beforeAll(async () => {
  await sequelize.sync({ force: true });

  // Contient "sandbox" volontairement : exerce la sélection de sandbox_payment_url (voir
  // dexpayService.createSubscription / isSandbox()), comme en environnement réel.
  process.env.DEXPAY_BASE_URL = 'https://api-sandbox.dexpay.test/api/v1';
  process.env.DEXPAY_PUBLIC_KEY = 'pub';
  process.env.DEXPAY_SECRET_KEY = SECRET;
  process.env.DEXPAY_PRODUCT_ESSENTIEL_MENSUEL = 'prod_essentiel_m';

  const reg = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Atelier DexPay', nom: 'Diagne', prenom: 'Seydou', telephone: '740000001', email: 'seydou@example.com', password: 'password',
  });
  adminToken = reg.body.token;
  companyId = reg.body.company.id;

  // Le plan d'essai par défaut est 'business' (aucun produit DexPay configuré dessus dans ce
  // test) : on repasse sur 'essentiel', pour lequel DEXPAY_PRODUCT_ESSENTIEL_MENSUEL est défini.
  const essentiel = await SubscriptionPlan.findOne({ where: { code: 'essentiel' } });
  await CompanySubscription.update({ planId: essentiel!.id }, { where: { companyId } });
});

afterAll(async () => {
  delete process.env.DEXPAY_BASE_URL;
  delete process.env.DEXPAY_PUBLIC_KEY;
  delete process.env.DEXPAY_SECRET_KEY;
  delete process.env.DEXPAY_PRODUCT_ESSENTIEL_MENSUEL;
  (global as any).fetch = originalFetch;
  await sequelize.close();
});

describe('DexPay — initier un abonnement (admin entreprise)', () => {
  it('503 si DexPay n’est pas configuré', async () => {
    const saved = process.env.DEXPAY_SECRET_KEY;
    delete process.env.DEXPAY_SECRET_KEY;
    const res = await request(app).post('/api/v1/companies/me/subscription/dexpay/subscribe').set('Authorization', `Bearer ${adminToken}`).send({ cycle: 'mensuel' });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('DEXPAY_NOT_CONFIGURED');
    process.env.DEXPAY_SECRET_KEY = saved;
  });

  it('crée un client + un abonnement DexPay SANS jamais activer l’abonnement Naatalix (attend le webhook)', async () => {
    // Forme réelle confirmée (vérifiée contre le vrai sandbox DexPay) : toute réponse est
    // enveloppée sous `data` ; /customers et /products exposent `id` directement, /subscriptions
    // imbrique l'id sous `subscription.id` et les URLs de paiement sous `payment`.
    mockFetch(async (url: string, options: any) => {
      if (url.endsWith('/customers')) return { ok: true, json: async () => ({ data: { id: 'cust_123' } }) };
      if (url.endsWith('/subscriptions')) {
        const body = JSON.parse(options.body);
        expect(body.customer_id).toBe('cust_123');
        expect(body.product_id).toBe('prod_essentiel_m');
        expect(body.metadata.organization_id).toBe(companyId);
        return {
          ok: true,
          json: async () => ({
            data: {
              subscription: { id: 'sub_123', status: 'pending' },
              payment: {
                payment_url: 'https://dexpay.test/pay/sub_123',
                sandbox_payment_url: 'https://dexpay.test/sandbox-pay/sub_123',
                checkout_session_id: 'session_123',
              },
            },
          }),
        };
      }
      throw new Error(`URL DexPay inattendue dans ce test : ${url}`);
    });

    const res = await request(app).post('/api/v1/companies/me/subscription/dexpay/subscribe').set('Authorization', `Bearer ${adminToken}`).send({ cycle: 'mensuel' });
    expect(res.status).toBe(201);
    // sandbox_payment_url préféré car DEXPAY_BASE_URL contient "sandbox" (isSandbox()).
    expect(res.body.checkoutUrl).toBe('https://dexpay.test/sandbox-pay/sub_123');
    expect(res.body.dexpaySubscriptionId).toBe('sub_123');

    const sub = await CompanySubscription.findOne({ where: { companyId } });
    expect(sub!.dexpayCustomerId).toBe('cust_123');
    expect(sub!.dexpaySubscriptionId).toBe('sub_123');
    expect(sub!.dexpayCheckoutSessionId).toBe('session_123');
    expect(sub!.statut).toBe('essai'); // pas activé avant confirmation webhook — le piège du guide.
  });

  it('un membre non-admin ne peut pas initier un abonnement DexPay', async () => {
    await request(app).post('/api/v1/companies/members').set('Authorization', `Bearer ${adminToken}`)
      .send({ nom: 'M', prenom: 'Un', telephone: '740000002', password: 'password', companyRole: 'commercial' });
    const login = await request(app).post('/api/v1/auth/login').send({ telephone: '740000002', password: 'password' });
    const res = await request(app).post('/api/v1/companies/me/subscription/dexpay/subscribe').set('Authorization', `Bearer ${login.body.token}`).send({ cycle: 'mensuel' });
    expect(res.status).toBe(403);
  });
});

describe('DexPay — webhook', () => {
  it('rejette une signature invalide (401), rien n’est modifié', async () => {
    const res = await sendWebhook({ event: 'subscription.payment.succeeded', data: { subscription_id: 'sub_123' } }, 'mauvaise-signature');
    expect(res.status).toBe(401);
    const sub = await CompanySubscription.findOne({ where: { companyId } });
    expect(sub!.statut).toBe('essai');
  });

  it('subscription.payment.succeeded active l’abonnement (retrouvé par subscription_id)', async () => {
    const res = await sendWebhook({ id: 'evt_1', event: 'subscription.payment.succeeded', data: { subscription_id: 'sub_123', metadata: { cycle: 'mensuel' } } });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('traite');

    const sub = await CompanySubscription.findOne({ where: { companyId } });
    expect(sub!.statut).toBe('actif');
    expect(sub!.dateFinPeriode).toBeTruthy();
  });

  it('rejoue le même eventId : pas retraité deux fois (idempotence)', async () => {
    const res = await sendWebhook({ id: 'evt_1', event: 'subscription.payment.succeeded', data: { subscription_id: 'sub_123' } });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('deja_traite');
  });

  it('checkout.completed réel (payload observé sur un vrai paiement sandbox réussi, 2026-09-25) : ni subscription_id ni metadata.organization_id — corrélé uniquement par checkout_session_id', async () => {
    await CompanySubscription.update({ statut: 'suspendu' }, { where: { companyId } });
    // Forme exacte capturée en conditions réelles : `metadata` existe mais ne contient QUE le
    // merchant_id de DexPay, jamais les metadata passées à la création de l'abonnement.
    const res = await sendWebhook({
      id: 'evt_2', event: 'checkout.completed', reference: 'REF_test', checkout_session_id: 'session_123',
      transaction_id: 'txn_1', status: 'completed', amount: 5000, currency: 'XOF',
      metadata: { merchant_id: 'm_1' },
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('traite');
    const sub = await CompanySubscription.findOne({ where: { companyId } });
    expect(sub!.statut).toBe('actif');
  });

  it('checkout.completed avec un statut non abouti est ignoré (pas d’activation)', async () => {
    await CompanySubscription.update({ statut: 'suspendu' }, { where: { companyId } });
    const res = await sendWebhook({ id: 'evt_3', event: 'checkout.completed', checkout_session_id: 'session_123', status: 'pending' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ignore');
    const sub = await CompanySubscription.findOne({ where: { companyId } });
    expect(sub!.statut).toBe('suspendu');
  });

  it('subscription.payment.failed notifie sans changer le statut (DexPay relance de lui-même), avec e-mail à l’admin', async () => {
    const sendEmailSpy = jest.spyOn(emailService, 'sendEmail').mockResolvedValue();
    const before = (await CompanySubscription.findOne({ where: { companyId } }))!.statut;
    const res = await sendWebhook({ id: 'evt_4', event: 'subscription.payment.failed', data: { subscription_id: 'sub_123' } });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('traite');
    const sub = await CompanySubscription.findOne({ where: { companyId } });
    expect(sub!.statut).toBe(before);
    // L'admin a été enregistré avec seydou@example.com (beforeAll) — notifyCompanyAdmins envoie
    // aussi un e-mail depuis le 2026-09-25 (alertes métier, en plus de la notification in-app).
    expect(sendEmailSpy).toHaveBeenCalledWith('seydou@example.com', expect.any(String), expect.any(String));
    sendEmailSpy.mockRestore();
  });

  it('subscription.cancelled suspend l’abonnement', async () => {
    await CompanySubscription.update({ statut: 'actif' }, { where: { companyId } });
    const res = await sendWebhook({ id: 'evt_5', event: 'subscription.cancelled', data: { subscription_id: 'sub_123' } });
    expect(res.status).toBe(200);
    const sub = await CompanySubscription.findOne({ where: { companyId } });
    expect(sub!.statut).toBe('suspendu');
    expect(sub!.motifSuspension).toContain('DexPay');
  });

  it('retrouve l’entreprise via metadata.organization_id en dernier repli (subscription_id ET checkout_session_id inconnus) — chemin de secours, pas confirmé nécessaire par un vrai paiement', async () => {
    await CompanySubscription.update({ statut: 'suspendu' }, { where: { companyId } });
    const res = await sendWebhook({ id: 'evt_6', event: 'subscription.payment.succeeded', data: { subscription_id: 'sub_jamais_vu', metadata: { organization_id: companyId, cycle: 'mensuel' } } });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('traite');
    const sub = await CompanySubscription.findOne({ where: { companyId } });
    expect(sub!.statut).toBe('actif');
  });

  it('accepte un payload avec les champs à plat à la racine (pas de clé "data")', async () => {
    await CompanySubscription.update({ statut: 'suspendu' }, { where: { companyId } });
    const res = await sendWebhook({ id: 'evt_7', event: 'subscription.payment.succeeded', subscription_id: 'sub_123' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('traite');
  });

  it('abonnement introuvable : anomalie journalisée, jamais un 500', async () => {
    const res = await sendWebhook({ id: 'evt_8', event: 'subscription.payment.succeeded', data: { subscription_id: 'sub_totalement_inconnu' } });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('anomalie');
  });
});

describe('DexPay — annulation demandée par l’entreprise', () => {
  it('refuse si aucun abonnement DexPay n’existe', async () => {
    const reg = await request(app).post('/api/v1/companies/register').send({
      companyNom: 'Atelier Sans DexPay', nom: 'Kane', prenom: 'Ndeye', telephone: '740000003', password: 'password',
    });
    const res = await request(app).post('/api/v1/companies/me/subscription/dexpay/cancel').set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(400);
  });

  it('demande l’annulation à DexPay sans suspendre immédiatement (attend le webhook)', async () => {
    mockFetch(async (url: string) => {
      expect(url).toContain('/subscriptions/sub_123/cancel');
      return { ok: true, json: async () => ({}) };
    });
    await CompanySubscription.update({ statut: 'actif' }, { where: { companyId } });

    const res = await request(app).post('/api/v1/companies/me/subscription/dexpay/cancel').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const sub = await CompanySubscription.findOne({ where: { companyId } });
    expect(sub!.statut).toBe('actif'); // toujours actif : seul le webhook subscription.cancelled suspend réellement.
  });
});
