import { Hono } from 'hono';
import importRouter from './imports.router';

const root = '/v1';
const app = new Hono();

app.route(root, importRouter);

app.get('*', c => c.json({ error: 'Not found' }, 404));

export default app;
