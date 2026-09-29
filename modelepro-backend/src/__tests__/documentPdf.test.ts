import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';

let companyAAdminToken: string;
let companyBAdminToken: string;

let customerAId: number;
let productAId: number;
let quoteId: number;
let orderId: number;
let invoiceId: number;
let paymentId: number;
let purchaseOrderId: number;

const isPdf = (buf: Buffer) => buf.slice(0, 5).toString('utf8') === '%PDF-';

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const regA = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Documents Entreprise A',
    nom: 'Diop', prenom: 'Fatou', telephone: '791000001', password: 'password',
  });
  companyAAdminToken = regA.body.token;

  // Une URL de logo volontairement injoignable : la génération ne doit jamais échouer pour ça.
  await request(app)
    .put('/api/v1/companies/me')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({
      logoUrl: 'http://127.0.0.1:1/logo.png',
      coordonneesPaiement: 'Wave : 77 000 00 00',
      mentionsCommerciales: 'NINEA 000000 - Merci de votre confiance',
    });

  const regB = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Documents Entreprise B',
    nom: 'Fall', prenom: 'Modou', telephone: '791000002', password: 'password',
  });
  companyBAdminToken = regB.body.token;

  const customerRes = await request(app)
    .post('/api/v1/crm/customers')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Client Documents', telephone: '770123456', adresse: 'Dakar' });
  customerAId = customerRes.body.customer.id;

  const productRes = await request(app)
    .post('/api/v1/crm/products')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Produit Documents', prixUnitaire: 15000, tauxTaxe: 18 });
  productAId = productRes.body.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Documents et exports — génération PDF', () => {
  it('génère le PDF d’un devis (logo injoignable géré sans erreur)', async () => {
    const quoteRes = await request(app)
      .post('/api/v1/crm/quotes')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ customerId: customerAId, lines: [{ productId: productAId, quantite: 2 }] });
    quoteId = quoteRes.body.id;

    const res = await request(app)
      .get(`/api/v1/crm/quotes/${quoteId}/pdf`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (c: Buffer) => chunks.push(c));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(isPdf(res.body as Buffer)).toBe(true);
  });

  it('refuse le PDF d’un devis à une autre entreprise (404, pas de fuite de document)', async () => {
    const res = await request(app)
      .get(`/api/v1/crm/quotes/${quoteId}/pdf`)
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(res.status).toBe(404);
  });

  it('génère le PDF d’un bon de commande client', async () => {
    const orderRes = await request(app)
      .post('/api/v1/crm/orders')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ customerId: customerAId, lines: [{ productId: productAId, quantite: 1 }] });
    orderId = orderRes.body.id;

    const res = await request(app)
      .get(`/api/v1/crm/orders/${orderId}/pdf`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (c: Buffer) => chunks.push(c));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(isPdf(res.body as Buffer)).toBe(true);
  });

  it('refuse le bon de livraison tant que la commande est en brouillon', async () => {
    const res = await request(app)
      .get(`/api/v1/crm/orders/${orderId}/delivery-note`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(400);
  });

  it('génère le bon de livraison une fois la commande confirmée', async () => {
    await request(app).patch(`/api/v1/crm/orders/${orderId}/confirm`).set('Authorization', `Bearer ${companyAAdminToken}`);

    const res = await request(app)
      .get(`/api/v1/crm/orders/${orderId}/delivery-note`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (c: Buffer) => chunks.push(c));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(isPdf(res.body as Buffer)).toBe(true);
  });

  it('génère le PDF d’une facture (issue de la conversion de la commande)', async () => {
    const invRes = await request(app)
      .post(`/api/v1/crm/orders/${orderId}/convert-to-invoice`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    invoiceId = invRes.body.id;

    const res = await request(app)
      .get(`/api/v1/crm/invoices/${invoiceId}/pdf`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (c: Buffer) => chunks.push(c));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(isPdf(res.body as Buffer)).toBe(true);
  });

  it('génère le reçu PDF d’un règlement', async () => {
    const payRes = await request(app)
      .post(`/api/v1/crm/invoices/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ montant: 5000, moyen: 'especes' });
    paymentId = payRes.body.payment.id;

    const res = await request(app)
      .get(`/api/v1/crm/invoices/${invoiceId}/payments/${paymentId}/receipt`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (c: Buffer) => chunks.push(c));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(isPdf(res.body as Buffer)).toBe(true);
  });

  it('génère le relevé client PDF', async () => {
    const res = await request(app)
      .get(`/api/v1/crm/customers/${customerAId}/statement/pdf`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (c: Buffer) => chunks.push(c));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(isPdf(res.body as Buffer)).toBe(true);
  });

  it('génère le PDF d’un bon de commande fournisseur', async () => {
    const supplierRes = await request(app)
      .post('/api/v1/crm/suppliers')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ nom: 'Fournisseur Documents' });

    const poRes = await request(app)
      .post('/api/v1/crm/purchase-orders')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ supplierId: supplierRes.body.id, lines: [{ designation: 'Matière première', quantite: 5, prixUnitaire: 2000 }] });
    purchaseOrderId = poRes.body.id;

    const res = await request(app)
      .get(`/api/v1/crm/purchase-orders/${purchaseOrderId}/pdf`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (c: Buffer) => chunks.push(c));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(isPdf(res.body as Buffer)).toBe(true);
  });

  it('isolation stricte : l’entreprise B ne peut récupérer aucun PDF de l’entreprise A', async () => {
    const endpoints = [
      `/api/v1/crm/orders/${orderId}/pdf`,
      `/api/v1/crm/invoices/${invoiceId}/pdf`,
      `/api/v1/crm/purchase-orders/${purchaseOrderId}/pdf`,
      `/api/v1/crm/customers/${customerAId}/statement/pdf`,
    ];
    for (const endpoint of endpoints) {
      const res = await request(app).get(endpoint).set('Authorization', `Bearer ${companyBAdminToken}`);
      expect(res.status).toBe(404);
    }
  });
});
