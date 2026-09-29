import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';

let companyAAdminToken: string;
let companyAReadonlyToken: string;
let companyBAdminToken: string;
let productId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const regA = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Catalogue Entreprise A',
    nom: 'Diop', prenom: 'Fatou', telephone: '784000001', password: 'password',
  });
  companyAAdminToken = regA.body.token;

  await request(app)
    .post('/api/v1/companies/members')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Ndiaye', prenom: 'Aida', telephone: '784000002', password: 'password', companyRole: 'readonly' });
  const readonlyLogin = await request(app).post('/api/v1/auth/login').send({ telephone: '784000002', password: 'password' });
  companyAReadonlyToken = readonlyLogin.body.token;

  const regB = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Catalogue Entreprise B',
    nom: 'Fall', prenom: 'Modou', telephone: '784000003', password: 'password',
  });
  companyBAdminToken = regB.body.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('CRM — Catalogue Produits/Services', () => {
  it('crée un produit physique avec prix et taxe', async () => {
    const res = await request(app)
      .post('/api/v1/crm/products')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({
        nom: 'Machine à coudre industrielle',
        type: 'produit',
        categorie: 'Équipement',
        prixUnitaire: 250000,
        tauxTaxe: 18,
        unite: 'piece',
        variantes: ['Noir', 'Blanc'],
      });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe('produit');
    expect(res.body.prixUnitaire).toBe(250000);
    expect(res.body.statut).toBe('actif');
    expect(res.body.disponible).toBe(true);
    expect(JSON.parse(res.body.variantes)).toEqual(['Noir', 'Blanc']);
    productId = res.body.id;
  });

  it('crée une prestation de service sans stock', async () => {
    const res = await request(app)
      .post('/api/v1/crm/products')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ nom: 'Formation couture', type: 'service', prixUnitaire: 50000 });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('service');
  });

  it('refuse au rôle readonly de créer un produit', async () => {
    const res = await request(app)
      .post('/api/v1/crm/products')
      .set('Authorization', `Bearer ${companyAReadonlyToken}`)
      .send({ nom: 'Interdit', prixUnitaire: 1000 });
    expect(res.status).toBe(403);
  });

  it('permet au rôle readonly de consulter le catalogue', async () => {
    const res = await request(app)
      .get('/api/v1/crm/products')
      .set('Authorization', `Bearer ${companyAReadonlyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
  });

  it('filtre le catalogue par type', async () => {
    const res = await request(app)
      .get('/api/v1/crm/products?type=service')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].nom).toBe('Formation couture');
  });

  it('recherche un produit par nom', async () => {
    const res = await request(app)
      .get('/api/v1/crm/products?search=machine')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it('désactive un produit (statut inactif) et le rend indisponible', async () => {
    const res = await request(app)
      .put(`/api/v1/crm/products/${productId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ statut: 'inactif', disponible: false });
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('inactif');
    expect(res.body.disponible).toBe(false);
  });

  it('filtre le catalogue par disponibilité', async () => {
    const res = await request(app)
      .get('/api/v1/crm/products?disponible=false')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].id).toBe(productId);
  });

  it('isolation stricte : l’entreprise B ne voit pas le catalogue de l’entreprise A', async () => {
    const listRes = await request(app)
      .get('/api/v1/crm/products')
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(0);

    const detailRes = await request(app)
      .get(`/api/v1/crm/products/${productId}`)
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(detailRes.status).toBe(404);

    const updateRes = await request(app)
      .put(`/api/v1/crm/products/${productId}`)
      .set('Authorization', `Bearer ${companyBAdminToken}`)
      .send({ prixUnitaire: 1 });
    expect(updateRes.status).toBe(404);
  });
});
