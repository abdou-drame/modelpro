import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { Artisan } from '../models/Artisan';
import { Creation } from '../models/Creation';
import { generateToken } from '../utils/auth';

let clientToken: string;
let clientId: number;
let artisanId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const clientUser = await User.create({ nom: 'Client', prenom: 'Test', telephone: '001', email: 'c@test.com', password: 'pwd', role: 'client' });
  clientId = clientUser.id;
  clientToken = generateToken(clientId, 'client');

  const artisanUser = await User.create({ nom: 'Artisan', prenom: 'A', telephone: '002', password: 'pwd', role: 'artisan' });
  const artisanProfile = await Artisan.create({ userId: artisanUser.id, métier: 'Tailleur', atelier: 'A1', localisation: 'Dakar' });
  artisanId = artisanProfile.id;

  await Creation.create({ artisanId, titre: 'Robe', prixEstimatif: 15000 });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Phase 2 - Profiles User / Artisan Public', () => {
  it('récupère mon profil via /api/v1/users/me', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(clientId);
    expect(res.body.nom).toBe('Client');
    expect(res.body.password).toBeUndefined();
  });

  it('met à jour mon profil', async () => {
    const res = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ nom: 'ClientModifie' });

    expect(res.status).toBe(200);
    expect(res.body.nom).toBe('ClientModifie');
  });

  it('récupère le profil public d\'un artisan avec ses créations', async () => {
    const res = await request(app).get(`/api/v1/artisans/${artisanId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(artisanId);
    expect(res.body.user.nom).toBe('Artisan');
    expect(res.body.catalogue).toBeDefined();
    expect(res.body.catalogue).toHaveLength(1);
    expect(res.body.noteMoyenne).toBe(0); // Pas de reviews
  });
});
