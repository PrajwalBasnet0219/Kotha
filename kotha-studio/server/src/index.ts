import type { Server } from 'node:http';
import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDb, disconnectDb } from './db';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main(): Promise<void> {
  await connectDb();

  const server: Server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'kotha api listening');
  });

  let shuttingDown = false;

  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');

    const forced = setTimeout(() => {
      logger.error('graceful shutdown timed out');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forced.unref();

    server.close((closeErr) => {
      void (async () => {
        try {
          await disconnectDb();
          if (closeErr) {
            logger.error({ err: closeErr }, 'http server close failed');
            process.exit(1);
          }
          logger.info('shutdown complete');
          process.exit(0);
        } catch (err) {
          logger.error({ err }, 'shutdown failed');
          process.exit(1);
        }
      })();
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err: unknown) => {
  logger.error({ err }, 'failed to start server');
  process.exit(1);
});
