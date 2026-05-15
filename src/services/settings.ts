import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { getSetting } from '@evershop/evershop/setting/services';

export const MAKEPAY_EXTENSION_VERSION = '0.1.0';

export type MakePaySettings = {
  status: number;
  displayName: string;
  apiBaseUrl: string;
  checkoutBaseUrl: string;
  companyId: string;
  apiKeyId: string;
  apiKeySecret: string;
  webhookSecret: string;
  settlementCurrency: string;
  expirationTime: string;
};

type MakePayConfig = Partial<{
  status: number | string;
  displayName: string;
  apiBaseUrl: string;
  checkoutBaseUrl: string;
  companyId: string;
  apiKeyId: string;
  apiKeySecret: string;
  webhookSecret: string;
  settlementCurrency: string;
  expirationTime: string;
}>;

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getMakePayConfig(): MakePayConfig {
  return (getConfig('system.makepay' as any, {}) ?? {}) as MakePayConfig;
}

export async function getMakePaySettings(): Promise<MakePaySettings> {
  const config = getMakePayConfig();

  return {
    status: numberValue(
      config.status ?? (await getSetting('makepayPaymentStatus', 0)),
      0
    ),
    displayName: stringValue(
      config.displayName,
      await getSetting('makepayDisplayName', 'MakePay')
    ),
    apiBaseUrl: stringValue(
      config.apiBaseUrl,
      await getSetting('makepayApiBaseUrl', 'https://www.makecrypto.io')
    ),
    checkoutBaseUrl: stringValue(
      config.checkoutBaseUrl,
      await getSetting('makepayCheckoutBaseUrl', 'https://makepay.io')
    ),
    companyId: stringValue(
      config.companyId,
      await getSetting('makepayCompanyId', '')
    ),
    apiKeyId: stringValue(
      config.apiKeyId,
      await getSetting('makepayApiKeyId', '')
    ),
    apiKeySecret: stringValue(
      config.apiKeySecret,
      await getSetting('makepayApiKeySecret', '')
    ),
    webhookSecret: stringValue(
      config.webhookSecret,
      await getSetting('makepayWebhookSecret', '')
    ),
    settlementCurrency: stringValue(
      config.settlementCurrency,
      await getSetting('makepaySettlementCurrency', 'USDT')
    ),
    expirationTime: stringValue(
      config.expirationTime,
      await getSetting('makepayExpirationTime', '12h')
    )
  };
}

export async function isMakePayConfigured(): Promise<boolean> {
  const settings = await getMakePaySettings();
  return Boolean(settings.apiKeyId && settings.apiKeySecret);
}
