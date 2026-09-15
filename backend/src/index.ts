import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import provincesData from './provinces-data.json';

const app = new Elysia()
  .use(cors())
  .get('/api/provinces', () => provincesData)
  .listen(3001);

console.log(`🚀 Elysia backend is running at http://${app.server?.hostname}:${app.server?.port}`);
