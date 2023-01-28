import { Hono } from 'hono';
import importRouter from './import.router';

const root = '/v1';
const app = new Hono();

app.route(root, importRouter);

app.get('*', ctx => ctx.json({ error: 'Not found' }, 404));

export default app;
