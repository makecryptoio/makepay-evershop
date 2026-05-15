import { getConfig } from '@evershop/evershop/lib/util/getConfig';

export default {
  Setting: {
    makepayDisplayName: (setting) => {
      const config = getConfig('system.makepay', {});
      if (config.displayName) {
        return config.displayName;
      }

      const row = setting.find((s) => s.name === 'makepayDisplayName');
      return row ? row.value : 'MakePay';
    }
  }
};
