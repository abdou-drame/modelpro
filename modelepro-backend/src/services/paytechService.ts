import crypto from 'crypto';

const PAYTECH_BASE_URL = 'https://paytech.sn/api/payment/request-payment';

interface InitiatePaymentParams {
  itemName: string;
  itemPrice: number;
  refCommand: string;
  commandName: string;
  customField: Record<string, unknown>;
  successUrl?: string;
  cancelUrl?: string;
}

interface PaytechInitiateResponse {
  success: 1 | 0;
  token: string;
  redirect_url: string;
  redirectUrl?: string;
}

/**
 * Appelle l'API PayTech pour initier un paiement et récupérer l'URL de paiement.
 */
export const initiatePayment = async (params: InitiatePaymentParams): Promise<PaytechInitiateResponse> => {
  const apiKey = process.env.PAYTECH_API_KEY;
  const apiSecret = process.env.PAYTECH_API_SECRET;
  const ipnUrl = process.env.PAYTECH_IPN_URL;

  if (!apiKey || !apiSecret) {
    throw new Error('PAYTECH_API_KEY / PAYTECH_API_SECRET non configurés.');
  }

  const response = await fetch(PAYTECH_BASE_URL, {
    method: 'POST',
    headers: {
      API_KEY: apiKey,
      API_SECRET: apiSecret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      item_name: params.itemName,
      item_price: params.itemPrice,
      currency: 'XOF',
      ref_command: params.refCommand,
      command_name: params.commandName,
      env: process.env.PAYTECH_ENV === 'prod' ? 'prod' : 'test',
      ipn_url: ipnUrl || undefined,
      success_url: params.successUrl || undefined,
      cancel_url: params.cancelUrl || undefined,
      custom_field: JSON.stringify(params.customField),
    }),
  });

  const data = (await response.json()) as PaytechInitiateResponse;

  if (!response.ok || data.success !== 1) {
    throw new Error(`Échec de l'initiation du paiement PayTech : ${JSON.stringify(data)}`);
  }

  return data;
};

/**
 * PayTech exige des successUrl/cancelUrl en http(s) valide (même contrainte que ipn_url) —
 * un schéma custom type "modelpro://..." est rejeté par leur API avant même d'afficher le
 * paiement. On fait donc pointer PayTech vers une page de redirection https de notre propre
 * backend (même domaine que l'IPN, déjà exposé publiquement), qui rebondit ensuite vers le
 * deep link mobile réel.
 */
export const buildAppRedirectUrl = (deepLink: string): string => {
  const ipnUrl = process.env.PAYTECH_IPN_URL;
  if (!ipnUrl) {
    throw new Error('PAYTECH_IPN_URL non configuré (nécessaire pour construire les URLs de redirection PayTech).');
  }
  const origin = new URL(ipnUrl).origin;
  return `${origin}/api/v1/payments/redirect?to=${encodeURIComponent(deepLink)}`;
};

/**
 * Vérifie qu'une notification IPN provient bien de PayTech en comparant le hash
 * SHA256 de nos clés API avec ceux transmis dans la requête.
 */
export const verifyIpnSignature = (body: { api_key_sha256?: string; api_secret_sha256?: string }): boolean => {
  const apiKey = process.env.PAYTECH_API_KEY;
  const apiSecret = process.env.PAYTECH_API_SECRET;

  if (!apiKey || !apiSecret || !body.api_key_sha256 || !body.api_secret_sha256) {
    return false;
  }

  const expectedKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const expectedSecretHash = crypto.createHash('sha256').update(apiSecret).digest('hex');

  return body.api_key_sha256 === expectedKeyHash && body.api_secret_sha256 === expectedSecretHash;
};
