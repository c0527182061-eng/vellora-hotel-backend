import path from 'node:path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { corsOrigins, env } from './config/env';
import { openApiDocument } from './docs/openapi';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { adminRouter } from './modules/admins/admin.routes';
import { authRouter } from './modules/auth/auth.routes';
import { bookingRouter } from './modules/bookings/booking.routes';
import { healthRouter } from './modules/health/health.routes';
import { roomRouter } from './modules/rooms/room.routes';
import { storage } from './storage';

export function createApp() {
  const app = express();

  // Render ושירותי ענן אחרים עובדים מאחורי Proxy
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // CORS: רק כתובות שהוגדרו ב־CORS_ORIGINS יכולות לקרוא לשרת מהדפדפן. "*" = כולם (לפיתוח בלבד)
  const allowAll = corsOrigins.includes('*');
  app.use(
    cors({
      origin: (origin, cb) => cb(null, allowAll || !origin || corsOrigins.includes(origin)),
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.use(express.json({ limit: '100kb' }));

  // Swagger
  app.get('/api-docs.json', (_req, res) => res.json(openApiDocument));
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'VELLORA HOTEL API',
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true, tryItOutEnabled: true },
    }),
  );

  // תמונות מקומיות – רק כשהאחסון הוא local (פיתוח)
  if (storage.provider === 'local') {
    app.use('/uploads', express.static(path.resolve(env.LOCAL_UPLOAD_DIR), { maxAge: '1d', fallthrough: false }));
  }

  app.get('/', (_req, res) => res.json({ name: 'VELLORA HOTEL API', docs: '/api-docs', health: '/api/health' }));
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/rooms', roomRouter);
  app.use('/api/bookings', bookingRouter);
  app.use('/api/admins', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
