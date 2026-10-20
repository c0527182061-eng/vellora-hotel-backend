import type { Request, Response } from 'express';
import type { NewUserInput } from '../../lib/zod';
import type { LoginInput } from './auth.schemas';
import * as authService from './auth.service';

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.valid.body as NewUserInput);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.valid.body as LoginInput);
  res.json(result);
}

export async function me(req: Request, res: Response) {
  const user = await authService.me(req.user!.id);
  res.json({ user });
}
