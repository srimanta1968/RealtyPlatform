import { buildServer } from './server.js';

async function main(): Promise<void> {
  const app = await buildServer();
  const port = Number(process.env.PORT ?? 4015);
  const host = process.env.HOST ?? '0.0.0.0';
  try {
    await app.listen({ port, host });
    app.log.info({ port, host }, 'media-service listening');
  } catch (err) {
    app.log.error({ err }, 'Failed to start media-service');
    process.exit(1);
  }
}

void main();
