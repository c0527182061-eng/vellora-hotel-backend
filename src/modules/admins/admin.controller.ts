import type { Request, Response } from 'express';
import type { NewUserInput } from '../../lib/zod';
import * as adminService from './admin.service';

export async function list(_req: Request, res: Response) {
  res.json({ items: await adminService.listAdmins() });
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await adminService.createAdmin(req.valid.body as NewUserInput));
}
