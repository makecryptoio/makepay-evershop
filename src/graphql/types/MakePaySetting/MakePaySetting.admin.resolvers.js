import { getConfig } from '@evershop/evershop/lib/util/getConfig';

function row(setting, name, fallback = null) {
  const found = setting.find((entry) => entry.name === name);
  return found ? found.value : fallback;
}

function masked(value) {
  return value ? `${String(value).slice(0, 5)}*******************************` : null;
}

export default {
  Setting: {
    makepayPaymentStatus: (setting) => {
      const config = getConfig('system.makepay', {});
      const value = config.status ?? row(setting, 'makepayPaymentStatus', 0);
      return Number.parseInt(String(value), 10) || 0;
    },
    makepayApiBaseUrl: (setting) => {
      const config = getConfig('system.makepay', {});
      return config.apiBaseUrl || row(setting, 'makepayApiBaseUrl', 'https://www.makecrypto.io');
    },
    makepayCheckoutBaseUrl: (setting) => {
      const config = getConfig('system.makepay', {});
      return config.checkoutBaseUrl || row(setting, 'makepayCheckoutBaseUrl', 'https://makepay.io');
    },
    makepayCompanyId: (setting) => {
      const config = getConfig('system.makepay', {});
      return config.companyId || row(setting, 'makepayCompanyId', '');
    },
    makepayApiKeyId: (setting) => {
      const config = getConfig('system.makepay', {});
      return config.apiKeyId || row(setting, 'makepayApiKeyId', '');
    },
    makepayApiKeySecret: (setting, _, { user }) => {
      const config = getConfig('system.makepay', {});
      if (config.apiKeySecret) {
        return masked(config.apiKeySecret);
      }

      return user ? row(setting, 'makepayApiKeySecret', '') : null;
    },
    makepayWebhookSecret: (setting, _, { user }) => {
      const config = getConfig('system.makepay', {});
      if (config.webhookSecret) {
        return masked(config.webhookSecret);
      }

      return user ? row(setting, 'makepayWebhookSecret', '') : null;
    },
    makepaySettlementCurrency: (setting) => {
      const config = getConfig('system.makepay', {});
      return config.settlementCurrency || row(setting, 'makepaySettlementCurrency', 'USDT');
    },
    makepayExpirationTime: (setting) => {
      const config = getConfig('system.makepay', {});
      return config.expirationTime || row(setting, 'makepayExpirationTime', '12h');
    }
  }
};
