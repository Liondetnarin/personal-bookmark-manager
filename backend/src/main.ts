import { createApp } from './create-app.js';
import { readConfig } from './config.js';

async function bootstrap(): Promise<void> {
  const config = readConfig();
  const app = await createApp(config);
  await app.listen(config.port, '127.0.0.1');
  console.log(`API listening at http://127.0.0.1:${config.port}`);
}

bootstrap().catch(() => {
  // URL/config errors can contain the original environment value.
  console.error('Startup failed. Check backend/.env, database migrations and port availability.');
  process.exitCode = 1;
});
