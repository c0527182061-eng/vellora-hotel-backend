import { Router } from 'express';
import { optionalAuth, requireAuth, requireRole } from '../../middleware/authenticate';
import { roomImageUpload } from '../../middleware/upload';
import { validate } from '../../middleware/validate';
import { idParams } from '../../lib/zod';
import * as controller from './room.controller';
import { createRoomSchema, listRoomsQuery, updateRoomSchema } from './room.schemas';

export const roomRouter = Router();

// ציבורי – מנהל מחובר רואה גם חדרים לא זמינים
roomRouter.get('/', optionalAuth, validate({ query: listRoomsQuery }), controller.list);
roomRouter.get('/:id', optionalAuth, validate({ params: idParams }), controller.getById);

// מנהל בלבד. ההעלאה (multipart) לפני הוולידציה, כי היא זו שקוראת את שדות הטופס
roomRouter.post('/', requireAuth, requireRole('ADMIN'), roomImageUpload, validate({ body: createRoomSchema }), controller.create);
roomRouter.patch('/:id', requireAuth, requireRole('ADMIN'), validate({ params: idParams }), roomImageUpload, validate({ body: updateRoomSchema }), controller.update);
roomRouter.delete('/:id', requireAuth, requireRole('ADMIN'), validate({ params: idParams }), controller.remove);
