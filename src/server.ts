import app from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';

async function start() {
  // Connect to the database BEFORE accepting HTTP traffic,
  // so no request ever hits an API without a database.
  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(`Server running on port ${env.port} (${env.nodeEnv})`);
  });

  // Graceful shutdown (Ctrl+C locally, SIGTERM from Render on redeploy):
  // stop accepting requests, finish in-flight ones, then close the DB.
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
