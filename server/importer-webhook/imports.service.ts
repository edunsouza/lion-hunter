import { Context } from 'hono';
import { notify } from './utils'
import { saveOrderInDB, saverOrderInSheets, Order, sheetNotUpdatedMessage } from './imports.repo'

type WebhookPayload = {
  plain: string;
  html: string | null;
  reply_plain: string | null;
  attachments: unknown[]
}

const logError = (error: any) => console.log(error.cause?.toString());
const isDuplicateOrderError = (error: any) => error?.cause?.toString().includes('UNIQUE constraint failed');
const isSheetNotUpdatedError = (error: any) => error === sheetNotUpdatedMessage;
const getDuplicateOrderMessage = (order: Order) => `Ordem ${order?.code} - ${order?.ticker} já importada`;
const getSuccessMessage = (order: Order) => `Ordem ${order?.code} importada: ${order?.operation} ${order?.amount} ${order?.ticker} $${order?.price}`
const invalidOrderMessage = 'Não foi possível extrair dados da ordem';

const extractOrderFromEmail = (body: string): Order | null => {
  const order = {} as Order;
  const fields = [
    { field: 'code', rx: /(?<=Número da ordem:\s)[a-z0-9]+/gi },
    { field: 'date', rx: /(?<=LIMIT em\s)[0-9T:-]+/gi },
    { field: 'operation', rx: /(?<=COMPRA \(B\) \/ VENDA \(S\)[\r\n\s]*)[a-z]+/gi },
    { field: 'amount', rx: /(?<=QUANTIDADE[\r\n\s]*)[0-9.,]+/gi },
    { field: 'ticker', rx: /(?<=SÍMBOLO[\r\n\s]*)[a-z0-9]+/gi },
    { field: 'price', rx: /(?<=PREÇO[\r\n\s]*US\$)[0-9.,]+/gi },
  ];

  for (const { field, rx } of fields) {
    const value = body?.match(rx)?.[0];

    if (!value) {
      return null;
    }

    order[field] = field === 'amount' ? value.replace('.0', '') : value;
  }

  return order;
}

export const importStakeOrderFromWebhook = async (c: Context): Promise<void> => {
  const { plain } = await c.req.json() as WebhookPayload;

  const order = extractOrderFromEmail(plain);

  if (!order) {
    await notify(c, invalidOrderMessage);
    return;
  }

  try {
    await saveOrderInDB(order, c.env.stocksDB);
    await saverOrderInSheets(order, c.env);
    await notify(c, getSuccessMessage(order));
  } catch (error) {
    logError(error);

    if (isDuplicateOrderError(error)) {
      await notify(c, getDuplicateOrderMessage(order));
    }

    if (isSheetNotUpdatedError(error)) {
      await notify(c, sheetNotUpdatedMessage);
    }
  }
};
