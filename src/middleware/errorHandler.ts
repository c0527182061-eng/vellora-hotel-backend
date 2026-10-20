import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { Prisma } from '../generated/prisma/client';
import { AppError, notFound } from '../lib/errors';
import { env } from '../config/env';

type ErrorBody = { error: { code: string; message: string; details?: { field: string; message: string }[] } };

function send(res: Response, status: number, body: ErrorBody) {
  res.status(status).json(body);
}

/** כתובת שלא קיימת => 404 במבנה אחיד */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(notFound(`הכתובת ${req.method} ${req.path} לא קיימת`));
}

// כל השגיאות בשרת מגיעות לכאן ומוחזרות באותו מבנה: { error: { code, message, details? } }
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return send(res, err.status, { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return send(res, 413, { error: { code: 'FILE_TOO_LARGE', message: 'התמונה גדולה מדי. הגודל המקסימלי הוא 5MB' } });
    }
    return send(res, 400, {
      error: { code: 'BAD_UPLOAD', message: 'העלאת הקובץ נכשלה', details: [{ field: err.field ?? 'image', message: 'יש לשלוח קובץ אחד בלבד בשדה image' }] },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return send(res, 409, { error: { code: 'DUPLICATE', message: 'קיימת כבר רשומה עם ערך זהה' } });
    if (err.code === 'P2025') return send(res, 404, { error: { code: 'NOT_FOUND', message: 'המשאב המבוקש לא נמצא' } });
  }

  const e = err as { type?: string; status?: number };
  if (e?.type === 'entity.parse.failed') {
    return send(res, 400, { error: { code: 'INVALID_JSON', message: 'גוף הבקשה אינו JSON תקין' } });
  }
  if (e?.type === 'entity.too.large') {
    return send(res, 413, { error: { code: 'PAYLOAD_TOO_LARGE', message: 'גוף הבקשה גדול מדי' } });
  }

  if (env.NODE_ENV !== 'test') console.error('Unhandled error:', err);
  return send(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'אירעה שגיאה בשרת. נסי שוב מאוחר יותר' } });
}
