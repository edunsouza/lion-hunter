import { Context } from 'hono';
import { getAuthToken } from 'web-auth-library/google';

export type Order = {
  code: string;
  date: string;
  operation: string;
  amount: string;
  ticker: string;
  price: string;
}

export const sheetNotUpdatedMessage = 'Não foi possível salvar ordem no Google Sheets';

export const saveOrderInDB = (order: Order, db: any): Promise<unknown> => {
  const { code, date, operation, amount, ticker, price } = order;
  const priceField = order.operation === 'BUY' ? 'buy_price' : 'sell_price';
  const query = `INSERT INTO orders_usa (code, date, operation, amount, ticker, ${priceField}) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`;
  return db.prepare(query).bind(code, date, operation, amount, ticker, price).run();
};

export const saverOrderInSheets = async (order: Order, env: Context['env']) => {
  const token = await getAuthToken({
    credentials: env.GCP_SA,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
  });

  const sheetId = env.ORDERS_SHEET_ID;
  const range = env.ORDERS_SHEET_RANGE;
  const { code, operation, amount, ticker } = order;
  const date = order.date.replace('T', ' ');
  const price = order.price.replace(',', '').replace('.', ',');
  const total = Number(amount) * Number(order.price);

  try {
    const data = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token.accessToken}`,
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [[code, date, operation, amount, ticker, price, total]],
      })
    }).then(response => response.json());

    console.log(data.updates.updatedRows);
    return data.updates.updatedRows;
  } catch (_) {
    throw sheetNotUpdatedMessage;
  }
};
