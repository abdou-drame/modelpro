import crypto from 'crypto';
import { initiatePayment, verifyIpnSignature } from '../services/paytechService';

describe('paytechService', () => {
  const originalEnv = { ...process.env };
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.PAYTECH_API_KEY = 'test-key';
    process.env.PAYTECH_API_SECRET = 'test-secret';
    process.env.PAYTECH_ENV = 'test';
    process.env.PAYTECH_IPN_URL = 'https://tunnel.example/api/v1/payments/paytech/ipn';
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    fetchSpy.mockRestore();
  });

  describe('initiatePayment', () => {
    it('envoie ipn_url, success_url et cancel_url à PayTech et renvoie le token/redirect_url', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ success: 1, token: 'TOKEN-123', redirect_url: 'https://paytech.sn/payment/TOKEN-123' }),
      } as Response);

      const result = await initiatePayment({
        itemName: 'Abonnement Essentiel',
        itemPrice: 3000,
        refCommand: 'ABO-1',
        commandName: 'Abonnement Essentiel (mensuel) - artisan #1',
        customField: { paymentId: 1, type: 'abonnement' },
        successUrl: 'modelpro://(artisan)/subscription?payment=success',
        cancelUrl: 'modelpro://(artisan)/subscription?payment=cancel',
      });

      expect(result).toEqual({ success: 1, token: 'TOKEN-123', redirect_url: 'https://paytech.sn/payment/TOKEN-123' });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://paytech.sn/api/payment/request-payment');
      expect(options.headers).toMatchObject({ API_KEY: 'test-key', API_SECRET: 'test-secret' });

      const body = JSON.parse(options.body);
      expect(body.ipn_url).toBe('https://tunnel.example/api/v1/payments/paytech/ipn');
      expect(body.success_url).toBe('modelpro://(artisan)/subscription?payment=success');
      expect(body.cancel_url).toBe('modelpro://(artisan)/subscription?payment=cancel');
      expect(body.ref_command).toBe('ABO-1');
      expect(body.item_price).toBe(3000);
      expect(body.env).toBe('test');
    });

    it("lève une erreur quand PayTech répond success !== 1", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ success: 0, token: '', redirect_url: '' }),
      } as Response);

      await expect(
        initiatePayment({
          itemName: 'Abonnement Essentiel',
          itemPrice: 3000,
          refCommand: 'ABO-2',
          commandName: 'Abonnement Essentiel (mensuel) - artisan #1',
          customField: {},
        })
      ).rejects.toThrow(/Échec de l'initiation du paiement PayTech/);
    });

    it('lève une erreur si les clés API ne sont pas configurées', async () => {
      delete process.env.PAYTECH_API_KEY;

      await expect(
        initiatePayment({
          itemName: 'Abonnement Essentiel',
          itemPrice: 3000,
          refCommand: 'ABO-3',
          commandName: 'x',
          customField: {},
        })
      ).rejects.toThrow(/PAYTECH_API_KEY/);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('verifyIpnSignature', () => {
    it('accepte une signature correcte (hash sha256 des clés API)', () => {
      const api_key_sha256 = crypto.createHash('sha256').update('test-key').digest('hex');
      const api_secret_sha256 = crypto.createHash('sha256').update('test-secret').digest('hex');

      expect(verifyIpnSignature({ api_key_sha256, api_secret_sha256 })).toBe(true);
    });

    it('rejette une signature incorrecte', () => {
      expect(
        verifyIpnSignature({ api_key_sha256: 'deadbeef', api_secret_sha256: 'deadbeef' })
      ).toBe(false);
    });

    it('rejette une requête sans hash', () => {
      expect(verifyIpnSignature({})).toBe(false);
    });
  });
});
