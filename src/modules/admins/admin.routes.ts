import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { newUserSchema } from '../../lib/zod';
import * as controller from './admin.controller';

export const adminRouter = Router();

// מנהלים בלבד
adminRouter.use(requireAuth, requireRole('ADMIN'));
adminRouter.get('/', controller.list);
adminRouter.post('/', validate({ body: newUserSchema }), controller.create);
