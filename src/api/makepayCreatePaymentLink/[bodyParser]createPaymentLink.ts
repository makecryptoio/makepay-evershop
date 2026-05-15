import { insert, select, update } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import { buildUrl } from '@evershop/evershop/lib/router';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '@evershop/evershop/lib/util/httpStatus';
import { getContextValue } from '@evershop/evershop/graphql/services';
import { error } from '@evershop/evershop/lib/log';
import {
  buildHostedCheckoutUrl,
  MakePayClient,
  type MakePayPaymentLink
} from '../../services/makepayClient.js';
import {
  getMakePaySettings,
  MAKEPAY_EXTENSION_VERSION
} from '../../services/settings.js';

type OrderRow = Record<string, any>;
type OrderItemRow = Record<string, any>;

export default async (
  request: any,
  response: any,
  next: (error?: unknown) => void
) => {
  let order: OrderRow | undefined;

  try {
    const { order_id: orderId } = request.body as { order_id?: string };
    if (!orderId) {
      return response.status(INVALID_PAYLOAD).json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'MakePay order ID is required.'
        }
      });
    }

    order = await select()
      .from('order')
      .where('uuid', '=', orderId)
      .and('payment_method', '=', 'makepay')
      .and('payment_status', '=', 'pending')
      .load(pool);

    if (!order) {
      return response.status(INVALID_PAYLOAD).json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid MakePay order.'
        }
      });
    }

    const items = (await select()
      .from('order_item')
      .where('order_item_order_id', '=', order.order_id)
      .execute(pool)) as OrderItemRow[];
    const settings = await getMakePaySettings();
    const client = new MakePayClient(settings);
    const homeUrl = requestOrigin(request);
    const successPath = `${buildUrl('checkoutSuccess')}/${order.uuid}`;
    const successUrl = absoluteUrl(homeUrl, successPath);
    const failureUrl = absoluteUrl(homeUrl, buildUrl('checkout'));
    const adminOrderPath = buildUrl('orderEdit', { id: order.uuid });
    const paymentLinkResponse = await client.createPaymentLink({
      title: `EverShop order #${order.order_number}`,
      description: describeOrder(order, items),
      amount: decimalString(order.grand_total),
      fiatCurrency: String(order.currency),
      currency: settings.settlementCurrency,
      orderId: `evershop_order_${order.uuid}`,
      customerEmail: nullableString(order.customer_email),
      clientId:
        nullableString(order.customer_id) || nullableString(order.customer_email),
      returnUrl: successUrl,
      successUrl,
      failureUrl,
      expirationTime: settings.expirationTime,
      metadata: {
        source: 'evershop',
        storeUrl: homeUrl,
        storeAdminOrderUrl: absoluteUrl(homeUrl, adminOrderPath),
        evershopOrderId: order.uuid,
        evershopOrderNumber: order.order_number,
        evershopNumericOrderId: order.order_id,
        moduleVersion: MAKEPAY_EXTENSION_VERSION
      }
    });

    const paymentLink = normalizePaymentLink(paymentLinkResponse);
    const paymentUid = paymentLink.uid || paymentLink.id;
    const publicUrl =
      paymentLink.publicUrl ||
      paymentLink.url ||
      (paymentUid
        ? buildHostedCheckoutUrl(settings.checkoutBaseUrl, paymentUid)
        : '');

    if (!paymentUid || !publicUrl) {
      throw new Error('MakePay did not return a hosted checkout URL.');
    }

    await update('order')
      .given({ integration_order_id: paymentUid })
      .where('uuid', '=', order.uuid)
      .execute(pool);

    await insert('order_activity')
      .given({
        order_activity_order_id: order.order_id,
        comment: [
          'MakePay checkout created.',
          `Payment link UID: ${paymentUid}`,
          `Payment URL: ${publicUrl}`
        ].join('\n'),
        customer_notified: 0
      })
      .execute(pool);

    response.status(OK);
    return response.json({
      data: {
        paymentLinkUid: paymentUid,
        publicUrl,
        dashboardUrl: paymentLink.dashboardUrl || null
      }
    });
  } catch (err) {
    error(err);
    if (order?.cart_id) {
      await update('cart')
        .given({ status: true })
        .where('cart_id', '=', order.cart_id)
        .execute(pool);
    }

    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message:
          err instanceof Error
            ? err.message
            : 'MakePay checkout could not be created.'
      }
    });
  }
};

function normalizePaymentLink(response: Record<string, any>): MakePayPaymentLink {
  const fromData = response.data?.paymentLink;
  if (fromData && typeof fromData === 'object') {
    return fromData;
  }

  if (response.paymentLink && typeof response.paymentLink === 'object') {
    return response.paymentLink;
  }

  return response as MakePayPaymentLink;
}

function describeOrder(order: OrderRow, items: OrderItemRow[]): string {
  const names = items
    .map((item) => {
      const name = nullableString(item.product_name);
      if (!name) {
        return '';
      }

      return `${decimalString(item.qty || 1)} x ${name}`;
    })
    .filter(Boolean)
    .slice(0, 5);

  if (names.length === 0) {
    return `Hosted MakePay checkout for EverShop order #${order.order_number}`;
  }

  const suffix = items.length > names.length ? ' and more' : '';
  return truncate(
    `EverShop order #${order.order_number}: ${names.join(', ')}${suffix}`,
    240
  );
}

function absoluteUrl(homeUrl: string, path: string): string {
  return new URL(path, `${homeUrl.replace(/\/+$/, '')}/`).toString();
}

function requestOrigin(request: any): string {
  const contextHomeUrl = getContextValue<string>(
    request as any,
    'homeUrl',
    '',
    true
  );
  if (contextHomeUrl) {
    return contextHomeUrl;
  }

  const req = request;
  const host =
    typeof req.get === 'function' ? req.get('host') : req.headers?.host;
  const protocol = req.protocol || 'https';
  return host ? `${protocol}://${host}` : 'https://localhost';
}

function decimalString(value: unknown): string {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return String(value ?? '');
  }

  return number.toFixed(8).replace(/\.?0+$/, '');
}

function nullableString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function truncate(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit - 1)}...` : value;
}
