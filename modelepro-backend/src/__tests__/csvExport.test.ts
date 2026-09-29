import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';

let adminToken: string;
let otherToken: string;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const regA = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Export Entreprise A', nom: 'Diop', prenom: 'Fatou', telephone: '792000001', password: 'password',
  });
  adminToken = regA.body.token;

  const regB = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Export Entreprise B', nom: 'Fall', prenom: 'Modou', telephone: '792000002', password: 'password',
  });
  otherToken = regB.body.token;

  const cust = await request(app).post('/api/v1/crm/customers').set('Authorization', `Bearer ${adminToken}`)
    .send({ nom: 'Client "Guillemets"; Virgule', telephone: '770000001' });
  await request(app).post('/api/v1/crm/products').set('Authorization', `Bearer ${adminToken}`)
    .send({ nom: 'Produit é', prixUnitaire: 1000 });
  await request(app).post('/api/v1/crm/suppliers').set('Authorization', `Bearer ${adminToken}`).send({ nom: 'Fournisseur X' });
  await request(app).post('/api/v1/crm/quotes').set('Authorization', `Bearer ${adminToken}`)
    .send({ customerId: cust.body.customer.id, lines: [{ designation: 'L', quantite: 1, prixUnitaire: 100 }] });
});

afterAll(async () => {
  await sequelize.close();
});

const endpoints = [
  '/api/v1/crm/customers/export',
  '/api/v1/crm/products/export',
  '/api/v1/crm/quotes/export',
  '/api/v1/crm/orders/export',
  '/api/v1/crm/invoices/export',
  '/api/v1/crm/suppliers/export',
  '/api/v1/crm/purchase-orders/export',
  '/api/v1/crm/stock/export',
];

describe('Exports CSV', () => {
  it.each(endpoints)('%s renvoie un CSV valide avec BOM UTF-8', async (url) => {
    const res = await request(app).get(url).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.text.startsWith('﻿')).toBe(true);
  });

  it('échappe correctement guillemets et point-virgule et conserve les accents', async () => {
    const res = await request(app).get('/api/v1/crm/customers/export').set('Authorization', `Bearer ${adminToken}`);
    expect(res.text).toContain('"Client ""Guillemets""; Virgule"');
    const prod = await request(app).get('/api/v1/crm/products/export').set('Authorization', `Bearer ${adminToken}`);
    expect(prod.text).toContain('Produit é');
  });

  it('isolation : l’entreprise B n’exporte aucune donnée de A', async () => {
    const res = await request(app).get('/api/v1/crm/customers/export').set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(200);
    expect(res.text).not.toContain('Guillemets');
    expect(res.text.trim().split('\r\n').length).toBe(1); // en-tête seul
  });

  it('refuse sans authentification', async () => {
    const res = await request(app).get('/api/v1/crm/invoices/export');
    expect(res.status).toBe(401);
  });
});
