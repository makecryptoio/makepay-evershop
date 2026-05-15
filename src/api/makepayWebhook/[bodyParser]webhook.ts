import {
  commit,
  insertOnUpdate,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { emit } from '@evershop/evershop/lib/event';
import { error } from '@evershop/evershop/lib/log';
import { getConnection } from '@evershop/evershop/lib/postgres';
import {
  INVALID_PAYLOAD,
  OK,
  UNAUTHORIZED
} from '@evershop/evershop/lib/util/httpStatus';
import {
  addOrderActivityLog,
  updatePaymentStatus
} from '@evershop/evershop/oms/services';
import { getMakePaySettings } from '../../services/settings.js';
import {
  extractOrderCandidates,
  extractPaymentStatus,
  extractPaymentUid,
  mapMakePayStatus,
  parseMakePayWebhook,
  paymentObject,
  verifyMakePayWebhookSignature,
  type MakePayWebhookPayload
} from '../../services/webhook.js';

type OrderRow = Record<string, any>;

export default async (
  request: any,
  response: any,
  next: (error?: unknown) => void
) => {
  const rawBody = Buffer.isBuffer(request.body)
    ? request.body
    : Buffer.from(String(request.body ?? ''), 'utf8');
  const settings = await getMakePaySettings();

  if (
    !verifyMakePayWebhookSignature(
      rawBody,
      request.headers['x-makepay-signature'],
      settings.webhookSecret
    )
  ) {
    return response.status(UNAUTHORIZED).json({
      error: {
        status: UNAUTHORIZED,
        message: 'Invalid MakePay webhook signature.'
      }
    });
  }

  let payload: MakePayWebhookPayload;
  try {
    payload = parseMakePayWebhook(rawBody);
  } catch (err) {
    return response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        message: err instanceof Error ? err.message : 'Invalid webhook body.'
      }
    });
  }

  const connection = await getConnection();
  await startTransaction(connection);

  try {
    const order = await resolveOrder(payload, connection);
    if (!order) {
      await commit(connection);
      return response.status(202).json({ ok: true, ignored: true });
    }

    const makepayStatus = extractPaymentStatus(payload);
    const evershopStatus = mapMakePayStatus(makepayStatus);
    const paymentUid = extractPaymentUid(payload) || `makepay_${order.uuid}`;
    const transaction = await select()
      .from('payment_transaction')
      .where('transaction_id', '=', paymentUid)
      .and('payment_transaction_order_id', '=', order.order_id)
      .load(connection);

    if (!order.integration_order_id && paymentUid) {
      await update('order')
        .given({ integration_order_id: paymentUid })
        .where('order_id', '=', order.order_id)
        .execute(connection);
    }

    if (evershopStatus === 'paid') {
      await insertOnUpdate('payment_transaction', [
        'transaction_id',
        'payment_transaction_order_id'
      ])
        .given({
          amount: resolveAmount(payload, order),
          payment_transaction_order_id: order.order_id,
          transaction_id: paymentUid,
          transaction_type: 'online',
          payment_action: 'capture',
          additional_information: JSON.stringify(payload)
        })
        .execute(connection);

      if (!transaction) {
        await updatePaymentStatus(order.order_id, 'paid', connection);
        await addOrderActivityLog(
          order.order_id,
          webhookNote(payload, makepayStatus, paymentUid),
          false,
          connection
        );
        await emit('order_placed', { ...order, payment_status: 'paid' });
      }
    } else if (order.payment_status !== 'paid') {
      await updatePaymentStatus(order.order_id, evershopStatus, connection);
      await addOrderActivityLog(
        order.order_id,
        webhookNote(payload, makepayStatus, paymentUid),
        false,
        connection
      );
    } else {
      await addOrderActivityLog(
        order.order_id,
        webhookNote(payload, makepayStatus, paymentUid),
        false,
        connection
      );
    }

    await commit(connection);
    return response.status(OK).json({ ok: true });
  } catch (err) {
    error(err);
    await rollback(connection);
    return response.status(INVALID_PAYLOAD).send(
      `MakePay webhook error: ${
        err instanceof Error ? err.message : 'Unknown error'
      }`
    );
  }
};

async function resolveOrder(
  payload: MakePayWebhookPayload,
  connection: any
): Promise<OrderRow | undefined> {
  for (const candidate of extractOrderCandidates(payload)) {
    const uuidMatch = candidate.match(/^evershop_order_([0-9a-f-]{32,36})$/i);
    const uuid = uuidMatch ? uuidMatch[1] : candidate;
    const byUuid = await select()
      .from('order')
      .where('uuid', '=', uuid)
      .load(connection);
    if (byUuid) {
      return byUuid;
    }

    const byNumber = await select()
      .from('order')
      .where('order_number', '=', candidate)
      .load(connection);
    if (byNumber) {
      return byNumber;
    }
  }

  const uid = extractPaymentUid(payload);
  if (!uid) {
    return undefined;
  }

  return await select()
    .from('order')
    .where('integration_order_id', '=', uid)
    .load(connection);
}

function resolveAmount(payload: MakePayWebhookPayload, order: OrderRow): number {
  const payment = paymentObject(payload);
  const rawAmount = payment.amount ?? payment.fiatAmount ?? order.grand_total;
  const amount = Number(rawAmount);
  return Number.isFinite(amount) ? amount : Number(order.grand_total);
}

function webhookNote(
  payload: MakePayWebhookPayload,
  status: string,
  paymentUid: string
): string {
  const payment = paymentObject(payload);
  const lines = [`MakePay payment webhook received: ${status}`];

  if (paymentUid) {
    lines.push(`paymentUid: ${paymentUid}`);
  }

  for (const key of ['asset', 'amount', 'currency', 'publicUrl', 'url']) {
    const value = payment[key];
    if (typeof value === 'string' || typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    }
  }

  return lines.join('\n');
}
