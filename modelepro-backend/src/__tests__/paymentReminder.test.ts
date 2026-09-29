import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { Invoice } from '../models/Invoice';
import { Notification } from '../models/Notification';
import { runPaymentReminders } from '../services/paymentReminderService';
import * as emailService from '../services/emailService';

jest.setTimeout(30000);

let adminToken: string;
let adminUserId: number;
let financeUserId: number;
let commercialUserId: number;
let customerId: number;

const createSentInvoice = async (dateEcheance: string) => {
  const res = await request(app).post('/api/v1/crm/invoices').set('Authorization', `Bearer ${adminToken}`)
    .send({ customerId, dateEcheance, lines: [{ designation: 'Prestation', quantite: 1, prixUnitaire: 10000 }] });
  await request(app).patch(`/api/v1/crm/invoices/${res.body.id}/send`).set('Authorization', `Bearer ${adminToken}`);
  return res.body.id as number;
};

const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * 24 * 3600 * 1000).toISOString().slice(0, 10);

beforeAll(async () => {
  await sequelize.sync({ force: true });
  const reg = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Relance Entreprise', nom: 'Diop', prenom: 'Fatou', telephone: '798000001', password: 'password',
  });
  adminToken = reg.body.token;
  adminUserId = reg.body.user.id;

  const finance = await request(app).post('/api/v1/companies/members').set('Authorization', `Bearer ${adminToken}`)
    .send({ nom: 'Fin', prenom: 'Ance', telephone: '798000002', password: 'password', companyRole: 'finance' });
  financeUserId = finance.body.id;
  const commercial = await request(app).post('/api/v1/companies/members').set('Authorization', `Bearer ${adminToken}`)
    .send({ nom: 'Com', prenom: 'Mercial', telephone: '798000003', password: 'password', companyRole: 'commercial' });
  commercialUserId = commercial.body.id;

  const cust = await request(app).post('/api/v1/crm/customers').set('Authorization', `Bearer ${adminToken}`).send({ nom: 'Client Relance' });
  customerId = cust.body.customer.id;
}, 60000);

afterAll(async () => {
  await sequelize.close();
});

describe('Suivi natif des paiements — relances d’échéance et de retard', () => {
  it('J-3 avant l’échéance : notifie admin et finance, pas le commercial, une seule fois', async () => {
    const invoiceId = await createSentInvoice(iso(3));
    const result = await runPaymentReminders();
    expect(result.upcoming).toBe(1);
    expect(result.overdue).toBe(0);

    expect(await Notification.count({ where: { userId: adminUserId, type: 'paiement' } })).toBe(1);
    expect(await Notification.count({ where: { userId: financeUserId, type: 'paiement' } })).toBe(1);
    expect(await Notification.count({ where: { userId: commercialUserId, type: 'paiement' } })).toBe(0);

    const invoice = await Invoice.findByPk(invoiceId);
    expect(invoice!.rappelEcheanceEnvoye).toBe(true);

    const again = await runPaymentReminders();
    expect(again.upcoming).toBe(0); // pas de doublon
    expect(await Notification.count({ where: { userId: adminUserId, type: 'paiement' } })).toBe(1);
  });

  it('échéance dépassée : alerte de retard, une seule fois, distincte du rappel J-3', async () => {
    const before = await Notification.count({ where: { userId: adminUserId } });
    await createSentInvoice(iso(-2));
    const result = await runPaymentReminders();
    expect(result.overdue).toBe(1);
    expect(await Notification.count({ where: { userId: adminUserId } })).toBe(before + 1);

    const again = await runPaymentReminders();
    expect(again.overdue).toBe(0);
  });

  it('une facture réglée intégralement sort du suivi (aucune relance)', async () => {
    const invoiceId = await createSentInvoice(iso(-5));
    await Invoice.update({ rappelEcheanceEnvoye: false, alerteRetardEnvoyee: false }, { where: { id: invoiceId } });
    await request(app).post(`/api/v1/crm/invoices/${invoiceId}/payments`).set('Authorization', `Bearer ${adminToken}`).send({ montant: 10000 });

    const before = await Notification.count({ where: { userId: adminUserId } });
    const result = await runPaymentReminders();
    expect(await Notification.count({ where: { userId: adminUserId } })).toBe(before); // pas de nouvelle notif pour celle-ci
  });

  it('un brouillon ou une facture sans échéance ne déclenchent rien', async () => {
    const draft = await request(app).post('/api/v1/crm/invoices').set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId, dateEcheance: iso(-10), lines: [{ designation: 'X', quantite: 1, prixUnitaire: 1000 }] });
    // jamais envoyée : reste brouillon.
    await request(app).post('/api/v1/crm/invoices').set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId, lines: [{ designation: 'Sans échéance', quantite: 1, prixUnitaire: 1000 }] }); // pas de dateEcheance

    const before = await Notification.count({ where: { userId: adminUserId } });
    await runPaymentReminders();
    expect(await Notification.count({ where: { userId: adminUserId } })).toBe(before);
    const d = await Invoice.findByPk(draft.body.id);
    expect(d!.statut).toBe('brouillon');
  });

  it('envoie aussi un e-mail au destinataire quand il a une adresse enregistrée (Phase 5, alertes métier)', async () => {
    const withEmail = await request(app).post('/api/v1/companies/members').set('Authorization', `Bearer ${adminToken}`)
      .send({ nom: 'Avec', prenom: 'Email', telephone: '798000010', email: 'finance-relance@example.com', password: 'password', companyRole: 'finance' });

    const sendEmailSpy = jest.spyOn(emailService, 'sendEmail').mockResolvedValue();
    await createSentInvoice(iso(3));
    await runPaymentReminders();

    const appelPourCeDestinataire = sendEmailSpy.mock.calls.find((call) => call[0] === 'finance-relance@example.com');
    expect(appelPourCeDestinataire).toBeTruthy();
    expect(appelPourCeDestinataire![1]).toContain('Échéance');
    sendEmailSpy.mockRestore();
    void withEmail;
  });

  it('isolation : les relances d’une entreprise ne notifient jamais une autre entreprise', async () => {
    const other = await request(app).post('/api/v1/companies/register').send({
      companyNom: 'Autre Entreprise Relance', nom: 'Fall', prenom: 'Modou', telephone: '798000009', password: 'password',
    });
    const before = await Notification.count({ where: { userId: other.body.user.id } });
    await createSentInvoice(iso(-1));
    await runPaymentReminders();
    expect(await Notification.count({ where: { userId: other.body.user.id } })).toBe(before);
  });
});
