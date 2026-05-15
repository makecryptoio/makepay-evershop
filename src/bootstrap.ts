import config from 'config';
import { getConfig } from '@evershop/evershop/lib/util/getConfig';
import { registerPaymentMethod } from '@evershop/evershop/checkout/services';
import { getMakePaySettings, isMakePayConfigured } from './services/settings.js';

export default async () => {
  config.util.setModuleDefaults('oms', {
    order: {
      paymentStatus: {
        makepay_processing: {
          name: 'MakePay Processing',
          isDefault: false,
          isCancelable: true,
          badge: 'warning'
        },
        makepay_failed: {
          name: 'MakePay Failed',
          isDefault: false,
          isCancelable: true,
          badge: 'destructive'
        },
        makepay_expired: {
          name: 'MakePay Expired',
          isDefault: false,
          isCancelable: true,
          badge: 'destructive'
        }
      },
      psoMapping: {
        'makepay_processing:*': 'processing',
        'makepay_failed:*': 'new',
        'makepay_expired:*': 'new'
      }
    }
  });

  registerPaymentMethod({
    init: async () => {
      const settings = await getMakePaySettings();
      return {
        code: 'makepay',
        name: settings.displayName
      };
    },
    validator: async () => {
      const makepayConfig = getConfig('system.makepay' as any, {}) as {
        status?: string | number;
      };
      const settings = await getMakePaySettings();
      const status = makepayConfig.status ?? settings.status;

      return (
        Number.parseInt(String(status), 10) === 1 &&
        (await isMakePayConfigured())
      );
    }
  });
};
