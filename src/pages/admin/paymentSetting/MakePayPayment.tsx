import { InputField } from '@evershop/evershop/components/common/form/InputField';
import { PasswordField } from '@evershop/evershop/components/common/form/PasswordField';
import { SelectField } from '@evershop/evershop/components/common/form/SelectField';
import { ToggleField } from '@evershop/evershop/components/common/form/ToggleField';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@evershop/evershop/components/common/ui/Card';
import React from 'react';

type MakePayPaymentProps = {
  makepayWebhookUrl: string;
  setting: {
    makepayPaymentStatus: true | false | 0 | 1;
    makepayDisplayName: string;
    makepayApiBaseUrl: string;
    makepayCheckoutBaseUrl: string;
    makepayCompanyId: string;
    makepayApiKeyId: string;
    makepayApiKeySecret: string;
    makepayWebhookSecret: string;
    makepaySettlementCurrency: string;
    makepayExpirationTime: string;
  };
};

function SettingRow({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <CardContent className="pt-4 border-t border-border first:border-t-0 first:pt-0">
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-1 items-center flex">
          <h4>{title}</h4>
        </div>
        <div className="col-span-2">{children}</div>
      </div>
    </CardContent>
  );
}

export default function MakePayPayment({
  makepayWebhookUrl,
  setting
}: MakePayPaymentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>MakePay</CardTitle>
        <CardDescription>
          Accept crypto payments through hosted MakePay checkout.
        </CardDescription>
      </CardHeader>
      <SettingRow title="Enable?">
        <ToggleField
          name="makepayPaymentStatus"
          defaultValue={setting.makepayPaymentStatus}
          trueValue={1}
          falseValue={0}
        />
      </SettingRow>
      <SettingRow title="Display Name">
        <InputField
          name="makepayDisplayName"
          placeholder="MakePay"
          defaultValue={setting.makepayDisplayName}
        />
      </SettingRow>
      <SettingRow title="API Base URL">
        <InputField
          name="makepayApiBaseUrl"
          placeholder="https://www.makecrypto.io"
          defaultValue={setting.makepayApiBaseUrl}
          helperText="Use production unless MakePay support asks you to change it."
        />
      </SettingRow>
      <SettingRow title="Checkout Base URL">
        <InputField
          name="makepayCheckoutBaseUrl"
          placeholder="https://makepay.io"
          defaultValue={setting.makepayCheckoutBaseUrl}
        />
      </SettingRow>
      <SettingRow title="Company ID">
        <InputField
          name="makepayCompanyId"
          placeholder="Optional MakePay company ID"
          defaultValue={setting.makepayCompanyId}
          helperText="Optional for API-key mode. If supplied, requests use the company-specific MakePay endpoint."
        />
      </SettingRow>
      <SettingRow title="API Key ID">
        <InputField
          name="makepayApiKeyId"
          placeholder="MakePay API key ID"
          defaultValue={setting.makepayApiKeyId}
        />
      </SettingRow>
      <SettingRow title="API Key Secret">
        <PasswordField
          name="makepayApiKeySecret"
          placeholder="MakePay API key secret"
          defaultValue={setting.makepayApiKeySecret}
          minLength={1}
          showToggle
        />
      </SettingRow>
      <SettingRow title="Webhook Secret">
        <PasswordField
          name="makepayWebhookSecret"
          placeholder="MakePay webhook signing secret"
          defaultValue={setting.makepayWebhookSecret}
          helperText={`Configure this MakePay webhook URL: ${makepayWebhookUrl}`}
          minLength={1}
          showToggle
        />
      </SettingRow>
      <SettingRow title="Settlement Currency">
        <InputField
          name="makepaySettlementCurrency"
          placeholder="USDT"
          defaultValue={setting.makepaySettlementCurrency}
        />
      </SettingRow>
      <SettingRow title="Expiration">
        <SelectField
          name="makepayExpirationTime"
          defaultValue={setting.makepayExpirationTime}
          options={[
            { label: '15 minutes', value: '15m' },
            { label: '1 hour', value: '1h' },
            { label: '12 hours', value: '12h' },
            { label: '24 hours', value: '24h' },
            { label: '72 hours', value: '72h' }
          ]}
        />
      </SettingRow>
    </Card>
  );
}

export const layout = {
  areaId: 'paymentSetting',
  sortOrder: 18
};

export const query = `
  query Query {
    makepayWebhookUrl: url(routeId: "makepayWebhook")
    setting {
      makepayPaymentStatus
      makepayDisplayName
      makepayApiBaseUrl
      makepayCheckoutBaseUrl
      makepayCompanyId
      makepayApiKeyId
      makepayApiKeySecret
      makepayWebhookSecret
      makepaySettlementCurrency
      makepayExpirationTime
    }
  }
`;
