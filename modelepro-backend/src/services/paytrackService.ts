import crypto from 'crypto';

// Client PayTrack — CONTRAT SUPPOSÉ, à remplacer par la documentation officielle PayTrack dès
// qu'elle est fournie (voir questions à la direction dans JOURNAL.md). Tout ce qui dépend du format
// réel (URL, en-têtes, noms de champs, algorithme de signature) est isolé dans CE fichier et dans
// le mapping de paytrackController.handleWebhook ; le reste de Naatalix ne connaît pas PayTrack.
//
// Hypothèses actuelles :
//  - création : POST {PAYTRACK_API_URL}/payments, Authorization: Bearer {PAYTRACK_API_KEY},
//    corps { reference, amount, currency, description } → { id, payment_url }
//  - webhook : signature HMAC-SHA256 (hex) du corps brut avec PAYTRACK_WEBHOOK_SECRET, dans
//    l'en-tête x-paytrack-signature
//    événement { event_id, type: 'payment.succeeded'|'payment.failed', reference, transaction_id,
//    amount, currency }

export const isPaytrackConfigured = (): boolean =>
  Boolean(process.env.PAYTRACK_API_URL && process.env.PAYTRACK_API_KEY && process.env.PAYTRACK_WEBHOOK_SECRET);

export interface PaymentRequestInput {
  referenceInterne: string;
  montant: number;
  devise: string;
  description: string;
}

export interface PaymentRequestResult {
  externalReference: string;
  paymentUrl: string;
}

export const createPaymentRequest = async (input: PaymentRequestInput): Promise<PaymentRequestResult> => {
  const response = await fetch(`${process.env.PAYTRACK_API_URL}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.PAYTRACK_API_KEY}` },
    body: JSON.stringify({ reference: input.referenceInterne, amount: input.montant, currency: input.devise, description: input.description }),
  });
  if (!response.ok) {
    throw new Error(`PayTrack a répondu ${response.status}`);
  }
  const data: any = await response.json();
  if (!data.id || !data.payment_url) {
    throw new Error('Réponse PayTrack invalide (id/payment_url manquants).');
  }
  return { externalReference: String(data.id), paymentUrl: String(data.payment_url) };
};

export const verifyWebhookSignature = (rawBody: Buffer | undefined, signature: string | undefined): boolean => {
  const secret = process.env.PAYTRACK_WEBHOOK_SECRET;
  if (!secret || !rawBody || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
