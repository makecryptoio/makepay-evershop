import { createHmac, timingSafeEqual } from 'node:crypto';

export type MakePayWebhookPayload = Record<string, any>;

export function verifyMakePayWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | string[] | undefined,
  secret: string,
  toleranceSeconds = 300
): boolean {
  const header = Array.isArray(signatureHeader)
    ? signatureHeader[0]
    : signatureHeader;

  if (!rawBody.length || !header || !secret) {
    return false;
  }

  const parts = parseSignatureHeader(header);
  const timestamp = Number(parts.t);
  const signature = parts.v1;

  if (
    !Number.isFinite(timestamp) ||
    !signature ||
    !/^[a-f0-9]+$/i.test(signature)
  ) {
    return false;
  }

  if (
    toleranceSeconds > 0 &&
    Math.abs(Math.floor(Date.now() / 1000) - timestamp) > toleranceSeconds
  ) {
    return false;
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest('hex');
  const actualBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function parseMakePayWebhook(rawBody: Buffer): MakePayWebhookPayload {
  const parsed = JSON.parse(rawBody.toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid MakePay webhook JSON body.');
  }

  return parsed;
}

export function paymentObject(payload: MakePayWebhookPayload): Record<string, any> {
  const data = isRecord(payload.data) ? payload.data : {};
  const candidates = [
    payload.paymentLink,
    payload.payment_link,
    data.paymentLink,
    data.object,
    data,
    payload
  ];

  for (const candidate of candidates) {
    if (isRecord(candidate) && Object.keys(candidate).length > 0) {
      return candidate;
    }
  }

  return payload;
}

export function extractPaymentUid(payload: MakePayWebhookPayload): string {
  const payment = paymentObject(payload);
  for (const key of ['uid', 'id', 'paymentUid', 'payment_uid']) {
    const value = payment[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  return '';
}

export function extractPaymentStatus(payload: MakePayWebhookPayload): string {
  if (isRecord(payload.session) && typeof payload.session.status === 'string') {
    return payload.session.status.toLowerCase();
  }

  const data = isRecord(payload.data) ? payload.data : {};
  const payment = paymentObject(payload);
  for (const source of [payload, data, payment]) {
    for (const key of ['status', 'paymentStatus', 'payment_status']) {
      const value = source[key];
      if (typeof value === 'string' && value.trim() !== '') {
        return value.trim().toLowerCase();
      }
    }
  }

  if (isRecord(payload.event) && typeof payload.event.type === 'string') {
    return payload.event.type.toLowerCase();
  }

  return 'pending';
}

export function extractOrderCandidates(payload: MakePayWebhookPayload): string[] {
  const payment = paymentObject(payload);
  const metadata = isRecord(payment.metadata) ? payment.metadata : {};
  const candidates = [
    payment.orderId,
    payment.merchantOrderId,
    payment.externalId,
    metadata.orderId,
    metadata.evershopOrderId,
    metadata.evershopOrderUuid,
    metadata.evershopOrderNumber,
    payload.orderId
  ];

  return candidates
    .filter((candidate): candidate is string | number => {
      return typeof candidate === 'string' || typeof candidate === 'number';
    })
    .map((candidate) => String(candidate).trim())
    .filter(Boolean);
}

export function mapMakePayStatus(status: string):
  | 'paid'
  | 'pending'
  | 'makepay_processing'
  | 'makepay_failed'
  | 'makepay_expired'
  | 'canceled' {
  if (
    [
      'completed',
      'complete',
      'paid',
      'succeeded',
      'success',
      'confirmed'
    ].includes(status)
  ) {
    return 'paid';
  }

  if (
    [
      'confirming',
      'processing',
      'paying',
      'deposit_received',
      'swapping',
      'sending',
      'underpaid'
    ].includes(status)
  ) {
    return 'makepay_processing';
  }

  if (status === 'expired') {
    return 'makepay_expired';
  }

  if (['failed', 'failure', 'error'].includes(status)) {
    return 'makepay_failed';
  }

  if (['cancelled', 'canceled'].includes(status)) {
    return 'canceled';
  }

  return 'pending';
}

function parseSignatureHeader(header: string): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const segment of header.split(',')) {
    const [key, ...rest] = segment.trim().split('=');
    if (key && rest.length > 0) {
      parts[key] = rest.join('=');
    }
  }

  return parts;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
