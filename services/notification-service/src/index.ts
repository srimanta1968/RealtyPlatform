import { loadProjectEnv } from '@kiana/service-kit';

loadProjectEnv(import.meta.url);

const { buildServer } = await import('./server.js');

async function main(): Promise<void> {
  const app = await buildServer();
  const port = Number(process.env.PORT ?? 4014);
  const host = process.env.HOST ?? '0.0.0.0';
  try {
    await app.listen({ port, host });
    app.log.info({ port, host }, 'notification-service listening');
  } catch (err) {
    app.log.error({ err }, 'Failed to start notification-service');
    process.exit(1);
  }
}

void main();
