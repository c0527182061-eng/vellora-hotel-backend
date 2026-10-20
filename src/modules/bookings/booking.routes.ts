import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { idParams } from '../../lib/zod';
import * as controller from './booking.controller';
import { adminBookingsQuery, createBookingSchema, decideBookingSchema, myBookingsQuery } from './booking.schemas';

export const bookingRouter = Router();

// כל מסלולי ההזמנות מחייבים התחברות
bookingRouter.use(requireAuth);

bookingRouter.post('/', requireRole('CUSTOMER'), validate({ body: createBookingSchema }), controller.create);
// חשוב: /my לפני /:id
bookingRouter.get('/my', requireRole('CUSTOMER'), validate({ query: myBookingsQuery }), controller.listMine);
bookingRouter.get('/', requireRole('ADMIN'), validate({ query: adminBookingsQuery }), controller.listAll);
bookingRouter.get('/:id', requireRole('CUSTOMER', 'ADMIN'), validate({ params: idParams }), controller.getById);
bookingRouter.patch('/:id/status', requireRole('ADMIN'), validate({ params: idParams, body: decideBookingSchema }), controller.decide);
