import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { badRequest } from '../lib/errors';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

// הקובץ נשמר בזיכרון לרגע, נבדק, ומשם עולה לשירות האחסון (R2 / Cloudinary)
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 20 },
});

export type ImageKind = { mime: 'image/jpeg' | 'image/png' | 'image/webp'; ext: 'jpg' | 'png' | 'webp' };

/** זיהוי סוג התמונה לפי תוכן הקובץ עצמו (ולא לפי השם או מה שהדפדפן טוען) */
export function detectImage(buf: Buffer): ImageKind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

/** מקבל שדה קובץ אחד בשם image (רשות), ובודק שהוא תמונה תקינה */
export function roomImageUpload(req: Request, res: Response, next: NextFunction) {
  multerUpload.single('image')(req, res, (err: unknown) => {
    if (err) return next(err);
    if (req.file) {
      const kind = detectImage(req.file.buffer);
      if (!kind) {
        return next(badRequest('קובץ התמונה אינו נתמך', [{ field: 'image', message: 'יש להעלות תמונה מסוג JPG, PNG או WEBP' }]));
      }
      req.file.mimetype = kind.mime;
    }
    next();
  });
}
