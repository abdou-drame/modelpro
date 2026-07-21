import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { Artisan } from '../models/Artisan';
import { Appointment } from '../models/Appointment';
import { generateToken } from '../utils/auth';

let artisanToken: string;
let appointmentId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const clientUser = await User.create({ nom: 'C', prenom: 'C', telephone: '001', password: 'pwd', role: 'client' });
  const artisanUser = await User.create({ nom: 'A', prenom: 'A', telephone: '002', password: 'pwd', role: 'artisan' });
  const artisanProfile = await Artisan.create({ userId: artisanUser.id, métier: 'Tailleur', atelier: 'X', localisation: 'Y' });
  artisanToken = generateToken(artisanUser.id, 'artisan');

  const apt = await Appointment.create({ artisanId: artisanProfile.id, clientId: clientUser.id, statut: 'demande' });
  appointmentId = apt.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Phase 2 - Appointments', () => {
  it('reporte un rdv avec une date proposée', async () => {
    const res = await request(app)
      .patch(`/api/v1/artisans/appointments/${appointmentId}/reschedule`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ proposedDate: '2026-08-15T14:00:00.000Z' });

    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('reporte');
    expect(res.body.proposedDate).toContain('2026-08-15');
  });

  it('refuse le report sans proposedDate', async () => {
    const res = await request(app)
      .patch(`/api/v1/artisans/appointments/${appointmentId}/reschedule`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
