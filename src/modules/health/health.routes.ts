import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { storage } from '../../storage';

export const healthRouter = Router();

// בדיקת בריאות: השרת עובד + מסד הנתונים עונה
healthRouter.get('/', async (_req, res) => {
  let database: 'up' | 'down' = 'up';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'down';
  }
  const ok = database === 'up';
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'error',
    database,
    storage: storage.provider,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
