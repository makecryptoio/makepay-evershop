import { MAKEPAY_EXTENSION_VERSION, type MakePaySettings } from './settings.js';

export type MakePayPaymentLinkPayload = {
  title: string;
  description?: string;
  amount: string | number;
  fiatCurrency?: string;
  currency?: string;
  orderId?: string;
  customerEmail?: string;
  clientId?: string;
  returnUrl?: string;
  successUrl?: string;
  failureUrl?: string;
  expirationTime?: string;
  metadata?: Record<string, unknown>;
};

export type MakePayPaymentLink = {
  uid?: string;
  id?: string;
  publicUrl?: string;
  url?: string;
  dashboardUrl?: string;
  status?: string;
  amount?: string | number;
  currency?: string;
  metadata?: Record<string, unknown>;
};

export type MakePayPaymentLinkResponse = {
  paymentLink?: MakePayPaymentLink;
  data?: {
    paymentLink?: MakePayPaymentLink;
  };
  [key: string]: unknown;
};

export class MakePayApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'MakePayApiError';
    this.status = status;
  }
}

export function buildHostedCheckoutUrl(
  checkoutBaseUrl: string,
  paymentUid: string
): string {
  return new URL(
    `/payment/${encodeURIComponent(paymentUid)}`,
    `${checkoutBaseUrl.replace(/\/+$/, '')}/`
  ).toString();
}

export class MakePayClient {
  private readonly settings: MakePaySettings;

  constructor(settings: MakePaySettings) {
    this.settings = settings;
  }

  async createPaymentLink(
    payload: MakePayPaymentLinkPayload
  ): Promise<MakePayPaymentLinkResponse> {
    const path = this.settings.companyId
      ? `/api/partner/v1/companies/${encodeURIComponent(
          this.settings.companyId
        )}/payment-links`
      : '/api/partner/v1/makepay/payment-links';

    return this.request('POST', path, {
      status: 'active',
      sendPaymentRequestEmail: false,
      payload
    });
  }

  private async request(
    method: 'POST' | 'GET' | 'PATCH' | 'PUT',
    path: string,
    body?: unknown
  ): Promise<MakePayPaymentLinkResponse> {
    if (!this.settings.apiKeyId || !this.settings.apiKeySecret) {
      throw new MakePayApiError('MakePay API credentials are missing.', 400);
    }

    const response = await fetch(
      `${this.settings.apiBaseUrl.replace(/\/+$/, '')}${path}`,
      {
        method,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'user-agent': `MakePayEverShop/${MAKEPAY_EXTENSION_VERSION}`,
          'x-makecrypto-key-id': this.settings.apiKeyId,
          'x-makecrypto-key-secret': this.settings.apiKeySecret
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      }
    );

    const text = await response.text();
    const decoded = safeJsonParse(text);
    if (!response.ok) {
      const message =
        decoded && typeof decoded.error === 'string'
          ? decoded.error
          : decoded && typeof decoded.message === 'string'
            ? decoded.message
            : `MakePay API request failed with HTTP ${response.status}.`;
      throw new MakePayApiError(message, response.status);
    }

    return decoded ?? {};
  }
}

function safeJsonParse(value: string): Record<string, any> | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
