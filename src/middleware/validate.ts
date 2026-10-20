import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { badRequest, type ErrorDetail } from '../lib/errors';

type Schemas = { body?: ZodType; query?: ZodType; params?: ZodType };

/** בודק את הבקשה מול סכמות Zod. התוצאה נשמרת ב־req.valid */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.valid = req.valid ?? {};
    const details: ErrorDetail[] = [];
    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) {
        req.valid[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ field: issue.path.join('.') || part, message: issue.message });
        }
      }
    }
    if (details.length) return next(badRequest('הנתונים שנשלחו אינם תקינים', details));
    next();
  };
}
