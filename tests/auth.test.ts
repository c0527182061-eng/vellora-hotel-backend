import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { prisma } from '../src/db/prisma';
import { api, createUser, expiredToken, resetDb } from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const newUser = { fullName: 'שרה ישראלי', email: 'Sara@Example.com', password: 'Hotel2026', confirmPassword: 'Hotel2026' };

describe('POST /api/auth/register', () => {
  it('נרשם כלקוח ומחזיר Token, בלי סיסמה בתשובה', async () => {
    const res = await api().post('/api/auth/register').send(newUser);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.user).toMatchObject({ fullName: 'שרה ישראלי', email: 'sara@example.com', role: 'CUSTOMER' });
    expect(JSON.stringify(res.body)).not.toMatch(/password|Hash/i);
    const stored = await prisma.user.findUnique({ where: { email: 'sara@example.com' } });
    expect(stored?.passwordHash).not.toBe('Hotel2026');
    expect(stored?.passwordHash.startsWith('$2')).toBe(true);
  });

  it('אי אפשר להירשם כמנהל גם אם שולחים role', async () => {
    const res = await api().post('/api/auth/register').send({ ...newUser, role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('CUSTOMER');
  });

  it('אימות סיסמה שונה => 400', async () => {
    const res = await api().post('/api/auth/register').send({ ...newUser, confirmPassword: 'Other2026' });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toContainEqual({ field: 'confirmPassword', message: 'הסיסמאות אינן תואמות' });
  });

  it('סיסמה חלשה ואימייל לא תקין => 400 עם פירוט', async () => {
    const res = await api().post('/api/auth/register').send({ fullName: 'א', email: 'not-an-email', password: 'short', confirmPassword: 'short' });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['fullName', 'email', 'password']));
  });

  it('אימייל קיים => 409', async () => {
    await api().post('/api/auth/register').send(newUser);
    const res = await api().post('/api/auth/register').send({ ...newUser, email: 'sara@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('JSON שבור => 400', async () => {
    const res = await api().post('/api/auth/register').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});

describe('POST /api/auth/login', () => {
  it('התחברות תקינה מחזירה JWT עם תוקף', async () => {
    const { user, password } = await createUser('CUSTOMER', { email: 'login@test.local' });
    const res = await api().post('/api/auth/login').send({ email: 'LOGIN@test.local', password });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, role: 'CUSTOMER' });
    expect(res.body.user.passwordHash).toBeUndefined();
    const decoded = jwt.decode(res.body.token) as jwt.JwtPayload;
    expect(decoded.sub).toBe(user.id);
    expect(decoded.exp).toBeGreaterThan(decoded.iat!);
  });

  it('סיסמה שגויה => 401', async () => {
    await createUser('CUSTOMER', { email: 'login@test.local' });
    const res = await api().post('/api/auth/login').send({ email: 'login@test.local', password: 'Wrong12345' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('אימייל או סיסמה שגויים');
  });

  it('משתמש שלא קיים => 401 עם אותה הודעה', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'nobody@test.local', password: 'Whatever123' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('אימייל או סיסמה שגויים');
  });

  it('שדות חסרים => 400', async () => {
    const res = await api().post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('עם Token תקין מחזיר את המשתמש', async () => {
    const { user, auth } = await createUser('ADMIN');
    const res = await api().get('/api/auth/me').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, role: 'ADMIN', email: user.email });
  });

  it('בלי Token => 401', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('Token לא תקין => 401', async () => {
    const res = await api().get('/api/auth/me').set('Authorization', 'Bearer not.a.token');
    expect(res.status).toBe(401);
  });

  it('Token שנחתם בסוד אחר => 401', async () => {
    const { user } = await createUser();
    const forged = jwt.sign({ role: 'ADMIN' }, 'some-other-secret-that-is-long-enough-123', { subject: user.id });
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('Token שפג תוקפו => 401', async () => {
    const { user } = await createUser();
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${expiredToken(user.id)}`);
    expect(res.status).toBe(401);
  });

  it('כותרת Authorization בלי Bearer => 401', async () => {
    const { token } = await createUser();
    const res = await api().get('/api/auth/me').set('Authorization', token);
    expect(res.status).toBe(401);
  });

  it('Token של משתמש שכבר לא קיים => 401', async () => {
    const { user, auth } = await createUser();
    await prisma.user.delete({ where: { id: user.id } });
    const res = await api().get('/api/auth/me').set(auth);
    expect(res.status).toBe(401);
  });
});
