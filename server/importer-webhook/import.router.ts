import { Context, Hono } from 'hono';
import { importStakeOrderFromWebhook } from './import.service';

const router = new Hono();

router.post('import/orders/stake', async (c: Context) => {
  await importStakeOrderFromWebhook(c);
  return c.json({ result: 'OK' }, 200);
});

export default router;
