import { loadProjectEnv } from '@kiana/service-kit';

loadProjectEnv(import.meta.url);

const { buildServer } = await import('./server.js');

async function main(): Promise<void> {
  const app = await buildServer();
  const port = Number(process.env.PORT ?? 4010);
  const host = process.env.HOST ?? '0.0.0.0';
  try {
    await app.listen({ port, host });
    app.log.info({ port, host }, 'user-service listening');
  } catch (err) {
    app.log.error({ err }, 'Failed to start user-service');
    process.exit(1);
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, async () => {
      app.log.info({ signal }, 'Shutting down user-service');
      await app.close();
      process.exit(0);
    });
  }
}

void main();
