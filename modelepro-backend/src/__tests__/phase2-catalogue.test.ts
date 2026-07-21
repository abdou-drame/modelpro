import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { Artisan } from '../models/Artisan';
import { Creation } from '../models/Creation';

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const artisanUser1 = await User.create({ nom: 'A1', prenom: 'A1', telephone: '001', password: 'pwd', role: 'artisan' });
  const artisanProfile1 = await Artisan.create({ userId: artisanUser1.id, métier: 'Tailleur', atelier: 'A1', localisation: 'Dakar' });

  const artisanUser2 = await User.create({ nom: 'A2', prenom: 'A2', telephone: '002', password: 'pwd', role: 'artisan' });
  const artisanProfile2 = await Artisan.create({ userId: artisanUser2.id, métier: 'Couturier', atelier: 'A2', localisation: 'Dakar' });

  await Creation.create({ artisanId: artisanProfile1.id, titre: 'Robe Africaine', description: 'Belle robe', prixEstimatif: 15000 });
  await Creation.create({ artisanId: artisanProfile1.id, titre: 'Costume', description: 'Costume homme', prixEstimatif: 25000 });
  await Creation.create({ artisanId: artisanProfile2.id, titre: 'Tunique', description: 'Tunique cool', prixEstimatif: 10000 });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Phase 2 - Catalogue avec filtres', () => {
  it('récupère tous les modèles si aucun filtre', async () => {
    const res = await request(app).get('/api/v1/models');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.total).toBe(3);
  });

  it('filtre par search (insensible à la casse)', async () => {
    const res = await request(app).get('/api/v1/models?search=robe');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].titre).toBe('Robe Africaine');
  });

  it('filtre par plage de prix', async () => {
    const res = await request(app).get('/api/v1/models?minPrice=10000&maxPrice=15000');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2); // Robe Africaine et Tunique
  });

  it('gère la pagination', async () => {
    const res = await request(app).get('/api/v1/models?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(3);
    expect(res.body.totalPages).toBe(2);
  });
});
