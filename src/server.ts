import { createApp } from './app';
import { ensureDemoRooms, ensureInitialAdmin } from './bootstrap/startup';
import { env } from './config/env';
import { prisma } from './db/prisma';
import { storage } from './storage';

async function main() {
  await ensureInitialAdmin();
  await ensureDemoRooms();

  const app = createApp();
  // Render נותן את הפורט במשתנה PORT
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`🏨 VELLORA HOTEL API פועל על פורט ${env.PORT}`);
    console.log(`   Swagger: /api-docs   ·   בדיקת בריאות: /api/health   ·   אחסון תמונות: ${storage.provider}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} התקבל, סוגר את השרת...`);
    server.close(() => {
      prisma.$disconnect().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('❌ השרת לא הצליח לעלות:', err);
  process.exit(1);
});
