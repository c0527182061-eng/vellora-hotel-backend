import fs from 'node:fs';
import SwaggerParser from '@apidevtools/swagger-parser';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma';
import { openApiDocument } from '../src/docs/openapi';
import { detectImage } from '../src/middleware/upload';
import { addDays, isValidDateString, nightsBetween, parseDate, todayInHotel } from '../src/lib/dates';
import { app, api } from './helpers';

afterAll(() => prisma.$disconnect());

describe('מערכת', () => {
  it('GET /api/health – שרת ומסד נתונים תקינים', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('כתובת שלא קיימת => 404 במבנה אחיד', async () => {
    const res = await api().get('/api/nothing-here');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('CORS: כתובת מורשית מקבלת הרשאה, אחרת לא', async () => {
    const ok = await api().get('/api/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const bad = await api().get('/api/health').set('Origin', 'http://evil.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
    const preflight = await api().options('/api/rooms').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'PATCH').set('Access-Control-Request-Headers', 'authorization,content-type');
    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-headers']).toMatch(/authorization/i);
  });

  it('Prisma: כל הטבלאות קיימות ותואמות לקוד', async () => {
    const tables = await prisma.$queryRaw<{ table_name: string }[]>`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    expect(tables.map((t) => t.table_name)).toEqual(expect.arrayContaining(['Booking', 'Room', 'User']));
    // שאילתה דרך ה־Client על כל מודל – נכשלת אם הסכמה וה־Migration לא תואמים
    await expect(prisma.user.findFirst()).resolves.toBeDefined();
    await expect(prisma.room.findFirst()).resolves.toBeDefined();
    await expect(prisma.booking.findFirst({ include: { room: true, user: true, decidedBy: true } })).resolves.toBeDefined();
  });

  it('Prisma: אילוצי תקינות במסד הנתונים חוסמים ערכים לא חוקיים', async () => {
    await expect(
      prisma.room.create({ data: { roomNumber: 77, name: 'x', type: 'SINGLE', pricePerNight: -1, maxGuests: 1, floor: 0 } }),
    ).rejects.toThrow();
  });
});

describe('Swagger / OpenAPI', () => {
  it('המסמך תקין לפי תקן OpenAPI 3', async () => {
    const copy = JSON.parse(JSON.stringify(openApiDocument));
    await expect(SwaggerParser.validate(copy)).resolves.toBeTruthy();
  });

  it('כל המסלולים בשרת מתועדים (16 Endpoints)', () => {
    const documented = Object.entries(openApiDocument.paths).flatMap(([p, ops]) =>
      Object.keys(ops).filter((k) => k !== 'parameters').map((m) => `${m.toUpperCase()} ${p}`),
    );
    const expected = [
      'GET /api/health',
      'POST /api/auth/register', 'POST /api/auth/login', 'GET /api/auth/me',
      'GET /api/rooms', 'POST /api/rooms', 'GET /api/rooms/{id}', 'PATCH /api/rooms/{id}', 'DELETE /api/rooms/{id}',
      'POST /api/bookings', 'GET /api/bookings', 'GET /api/bookings/my', 'GET /api/bookings/{id}', 'PATCH /api/bookings/{id}/status',
      'GET /api/admins', 'POST /api/admins',
    ];
    expect(documented.sort()).toEqual(expected.sort());
  });

  it('קיים Security Scheme מסוג Bearer JWT, וכל מסלול מוגן מסומן', () => {
    expect(openApiDocument.components.securitySchemes.bearerAuth).toMatchObject({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' });
    const paths = openApiDocument.paths as unknown as Record<string, Record<string, { security?: unknown[]; responses: Record<string, unknown> }>>;
    for (const [p, ops] of Object.entries(paths)) {
      for (const [m, op] of Object.entries(ops)) {
        if (m === 'parameters') continue;
        if (op.responses['401'] && p !== '/api/auth/login') expect(op.security, `${m} ${p}`).toEqual([{ bearerAuth: [] }]);
      }
    }
  });

  it('/api-docs נפתח ו־/api-docs.json מחזיר את המסמך', async () => {
    const ui = await api().get('/api-docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');
    const json = await api().get('/api-docs.json');
    expect(json.body.openapi).toBe('3.0.3');
  });

  it('docs/openapi.json מעודכן ותואם לקוד', () => {
    const file = JSON.parse(fs.readFileSync('docs/openapi.json', 'utf8'));
    expect(file).toEqual(JSON.parse(JSON.stringify(openApiDocument)));
  });

  it('אין קוד React בפרויקט', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(Object.keys(all).some((d) => /react/i.test(d))).toBe(false);
    expect(app).toBeDefined();
  });
});

describe('פונקציות עזר', () => {
  it('תאריכים', () => {
    expect(isValidDateString('2026-02-28')).toBe(true);
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('26-2-1')).toBe(false);
    expect(nightsBetween(parseDate('2026-03-28'), parseDate('2026-03-31'))).toBe(3);
    expect(addDays(parseDate('2026-12-31'), 1).toISOString().slice(0, 10)).toBe('2027-01-01');
    // אזור זמן ישראל: 23:30 UTC ב־1/7 הוא כבר 2/7 בישראל
    expect(todayInHotel(new Date('2026-07-01T23:30:00Z')).toISOString().slice(0, 10)).toBe('2026-07-02');
  });

  it('זיהוי סוג תמונה לפי התוכן', () => {
    expect(detectImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe('jpg');
    expect(detectImage(Buffer.from('RIFF0000WEBPVP8 ', 'ascii'))?.ext).toBe('webp');
    expect(detectImage(Buffer.from('<svg></svg>'))).toBeNull();
  });
});
