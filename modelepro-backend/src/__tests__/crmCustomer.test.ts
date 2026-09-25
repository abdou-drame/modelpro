import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';

let companyAAdminToken: string;
let companyACommercialToken: string;
let companyAReadonlyToken: string;
let companyBAdminToken: string;

let prospectId: number;
let contactId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const regA = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'CRM Entreprise A',
    nom: 'Diop', prenom: 'Fatou', telephone: '781000001', password: 'password',
  });
  companyAAdminToken = regA.body.token;

  const commercial = await request(app)
    .post('/api/v1/companies/members')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Sarr', prenom: 'Omar', telephone: '781000002', password: 'password', companyRole: 'commercial' });
  const commercialLogin = await request(app).post('/api/v1/auth/login').send({ telephone: '781000002', password: 'password' });
  companyACommercialToken = commercialLogin.body.token;

  await request(app)
    .post('/api/v1/companies/members')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Ndiaye', prenom: 'Aida', telephone: '781000003', password: 'password', companyRole: 'readonly' });
  const readonlyLogin = await request(app).post('/api/v1/auth/login').send({ telephone: '781000003', password: 'password' });
  companyAReadonlyToken = readonlyLogin.body.token;

  const regB = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'CRM Entreprise B',
    nom: 'Fall', prenom: 'Modou', telephone: '781000004', password: 'password',
  });
  companyBAdminToken = regB.body.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('CRM — Clients / Prospects / Contacts', () => {
  it('bloque toute route CRM sans authentification', async () => {
    const res = await request(app).get('/api/v1/crm/customers');
    expect(res.status).toBe(401);
  });

  it('crée un prospect (rôle commercial autorisé)', async () => {
    const res = await request(app)
      .post('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${companyACommercialToken}`)
      .send({ nom: 'Boutique Teranga', telephone: '770111111', email: 'contact@teranga.sn' });

    expect(res.status).toBe(201);
    expect(res.body.customer.statut).toBe('prospect');
    expect(res.body.customer.type).toBe('entreprise');
    prospectId = res.body.customer.id;
  });

  it('refuse au rôle readonly de créer un prospect', async () => {
    const res = await request(app)
      .post('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${companyAReadonlyToken}`)
      .send({ nom: 'Autre Boutique', telephone: '770222222' });
    expect(res.status).toBe(403);
  });

  it('permet au rôle readonly de lire la liste des clients/prospects', async () => {
    const res = await request(app)
      .get('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${companyAReadonlyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it('signale un doublon probable (même téléphone) sans bloquer la création', async () => {
    const res = await request(app)
      .post('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${companyACommercialToken}`)
      .send({ nom: 'Boutique Teranga Bis', telephone: '770111111' });

    expect(res.status).toBe(201);
    expect(res.body.warnings.possibleDuplicates.length).toBeGreaterThan(0);
  });

  it('endpoint dédié de détection de doublon', async () => {
    const res = await request(app)
      .get('/api/v1/crm/customers/check-duplicate?telephone=770111111')
      .set('Authorization', `Bearer ${companyACommercialToken}`);
    expect(res.status).toBe(200);
    expect(res.body.duplicates.length).toBe(2);
  });

  it('recherche un client/prospect par nom', async () => {
    const res = await request(app)
      .get('/api/v1/crm/customers?search=teranga')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
  });

  it('modifie un prospect', async () => {
    const res = await request(app)
      .put(`/api/v1/crm/customers/${prospectId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ segment: 'VIP', notes: 'Client potentiel important' });
    expect(res.status).toBe(200);
    expect(res.body.segment).toBe('VIP');
  });

  it('ajoute un contact au prospect', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/customers/${prospectId}/contacts`)
      .set('Authorization', `Bearer ${companyACommercialToken}`)
      .send({ nom: 'Sow', prenom: 'Khady', fonction: 'Gérante', telephone: '770333333' });
    expect(res.status).toBe(201);
    contactId = res.body.id;
  });

  it('convertit le prospect en client (parcours principal, sans ressaisie)', async () => {
    const res = await request(app)
      .patch(`/api/v1/crm/customers/${prospectId}/convert`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('client');
    expect(res.body.convertedAt).not.toBeNull();
    expect(res.body.nom).toBe('Boutique Teranga');
  });

  it('refuse de reconvertir un client déjà converti', async () => {
    const res = await request(app)
      .patch(`/api/v1/crm/customers/${prospectId}/convert`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(400);
  });

  it('récupère la fiche client avec ses contacts', async () => {
    const res = await request(app)
      .get(`/api/v1/crm/customers/${prospectId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('client');
    expect(res.body.contacts.length).toBe(1);
    expect(res.body.contacts[0].nom).toBe('Sow');
  });

  it('isolation stricte : l’entreprise B ne voit aucun client/prospect de l’entreprise A', async () => {
    const listRes = await request(app)
      .get('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(0);

    const detailRes = await request(app)
      .get(`/api/v1/crm/customers/${prospectId}`)
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(detailRes.status).toBe(404);
  });

  it('isolation stricte : l’entreprise B ne peut ni modifier ni convertir un client de l’entreprise A', async () => {
    const updateRes = await request(app)
      .put(`/api/v1/crm/customers/${prospectId}`)
      .set('Authorization', `Bearer ${companyBAdminToken}`)
      .send({ nom: 'Piraté' });
    expect(updateRes.status).toBe(404);

    const convertRes = await request(app)
      .patch(`/api/v1/crm/customers/${prospectId}/convert`)
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(convertRes.status).toBe(404);
  });

  it('isolation stricte : l’entreprise B ne peut pas accéder aux contacts de l’entreprise A', async () => {
    const listContactsRes = await request(app)
      .get(`/api/v1/crm/customers/${prospectId}/contacts`)
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(listContactsRes.status).toBe(404);

    const updateContactRes = await request(app)
      .put(`/api/v1/crm/contacts/${contactId}`)
      .set('Authorization', `Bearer ${companyBAdminToken}`)
      .send({ nom: 'Piraté' });
    expect(updateContactRes.status).toBe(404);
  });

  it('un compte ModèlePro (sans entreprise) est rejeté sur les routes CRM', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send({
      nom: 'Client', prenom: 'ModelePro', telephone: '781000005', password: 'password', role: 'client',
    });
    const res = await request(app)
      .get('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${registerRes.body.token}`);
    expect(res.status).toBe(403);
  });
});
