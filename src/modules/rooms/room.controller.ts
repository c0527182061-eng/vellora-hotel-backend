import type { Request, Response } from 'express';
import { isAdmin } from '../../middleware/authenticate';
import { detectImage } from '../../middleware/upload';
import type { UploadInput } from '../../storage';
import type { CreateRoomInput, ListRoomsQuery, UpdateRoomInput } from './room.schemas';
import * as roomService from './room.service';

type IdParams = { id: string };

function uploadedImage(req: Request): UploadInput | undefined {
  if (!req.file) return undefined;
  const kind = detectImage(req.file.buffer)!; // כבר נבדק ב־roomImageUpload
  return { buffer: req.file.buffer, mime: kind.mime, ext: kind.ext };
}

export async function list(req: Request, res: Response) {
  res.json(await roomService.listRooms(req.valid.query as ListRoomsQuery, isAdmin(req)));
}

export async function getById(req: Request, res: Response) {
  const { id } = req.valid.params as IdParams;
  res.json(await roomService.getRoom(id, isAdmin(req)));
}

export async function create(req: Request, res: Response) {
  const room = await roomService.createRoom(req.valid.body as CreateRoomInput, uploadedImage(req));
  res.status(201).json(room);
}

export async function update(req: Request, res: Response) {
  const { id } = req.valid.params as IdParams;
  const room = await roomService.updateRoom(id, req.valid.body as UpdateRoomInput, uploadedImage(req));
  res.json(room);
}

export async function remove(req: Request, res: Response) {
  const { id } = req.valid.params as IdParams;
  await roomService.deleteRoom(id);
  res.status(204).end();
}
