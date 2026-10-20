import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { hashPassword, signToken } from '../src/lib/auth';
import { addDays, formatDate, todayInHotel } from '../src/lib/dates';
import type { Role, RoomStatus, RoomType } from '../src/generated/prisma/client';

export const app = createApp();
export const api = () => request(app);

export async function resetDb() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Booking", "Room", "User" RESTART IDENTITY CASCADE');
}

let counter = 0;
export async function createUser(role: Role = 'CUSTOMER', overrides: { email?: string; password?: string; fullName?: string } = {}) {
  counter += 1;
  const password = overrides.password ?? 'Password123';
  const user = await prisma.user.create({
    data: {
      email: overrides.email ?? `${role.toLowerCase()}${counter}@test.local`,
      fullName: overrides.fullName ?? (role === 'ADMIN' ? `מנהל ${counter}` : `לקוח ${counter}`),
      role,
      passwordHash: await hashPassword(password),
    },
  });
  return { user, password, token: signToken(user.id, user.role), auth: { Authorization: `Bearer ${signToken(user.id, user.role)}` } };
}

export async function createRoom(overrides: Partial<{ roomNumber: number; name: string; type: RoomType; pricePerNight: number; maxGuests: number; floor: number; status: RoomStatus }> = {}) {
  counter += 1;
  return prisma.room.create({
    data: {
      roomNumber: overrides.roomNumber ?? 1000 + counter,
      name: overrides.name ?? `חדר בדיקה ${counter}`,
      type: overrides.type ?? 'DOUBLE',
      pricePerNight: overrides.pricePerNight ?? 500,
      maxGuests: overrides.maxGuests ?? 2,
      floor: overrides.floor ?? 1,
      status: overrides.status ?? 'AVAILABLE',
    },
  });
}

/** תאריך יחסי להיום, בפורמט YYYY-MM-DD */
export const day = (offset: number) => formatDate(addDays(todayInHotel(), offset));

export function expiredToken(userId: string) {
  return jwt.sign({ role: 'CUSTOMER', exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET!, { subject: userId });
}

// תמונת PNG קטנה (1x1) לבדיקות העלאה
export const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
