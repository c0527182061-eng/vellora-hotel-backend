import type { Request, Response } from 'express';
import type { AdminBookingsQuery, CreateBookingInput, DecideBookingInput, MyBookingsQuery } from './booking.schemas';
import * as bookingService from './booking.service';

type IdParams = { id: string };

export async function create(req: Request, res: Response) {
  const booking = await bookingService.createBooking(req.user!, req.valid.body as CreateBookingInput);
  res.status(201).json(booking);
}

export async function listMine(req: Request, res: Response) {
  res.json(await bookingService.listMyBookings(req.user!.id, req.valid.query as MyBookingsQuery));
}

export async function listAll(req: Request, res: Response) {
  res.json(await bookingService.listAllBookings(req.valid.query as AdminBookingsQuery));
}

export async function getById(req: Request, res: Response) {
  const { id } = req.valid.params as IdParams;
  res.json(await bookingService.getBooking(id, req.user!));
}

export async function decide(req: Request, res: Response) {
  const { id } = req.valid.params as IdParams;
  res.json(await bookingService.decideBooking(id, req.user!.id, req.valid.body as DecideBookingInput));
}
