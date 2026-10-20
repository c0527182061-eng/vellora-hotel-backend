import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma';
import { api, createUser, resetDb } from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const newAdmin = { fullName: 'מנהל חדש', email: 'new.admin@test.local', password: 'Admin2026', confirmPassword: 'Admin2026' };

describe('/api/admins', () => {
  it('מנהל מוסיף מנהל, והמנהל החדש יכול להתחבר ולפעול כמנהל', async () => {
    const { auth } = await createUser('ADMIN');
    const res = await api().post('/api/admins').set(auth).send(newAdmin);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'new.admin@test.local', role: 'ADMIN' });
    expect(res.body.passwordHash).toBeUndefined();

    const login = await api().post('/api/auth/login').send({ email: newAdmin.email, password: newAdmin.password });
    expect(login.body.user.role).toBe('ADMIN');
    expect((await api().get('/api/admins').set('Authorization', `Bearer ${login.body.token}`)).status).toBe(200);
  });

  it('רשימת המנהלים כוללת רק מנהלים', async () => {
    const { auth } = await createUser('ADMIN');
    await createUser('ADMIN');
    await createUser('CUSTOMER');
    const res = await api().get('/api/admins').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items.every((u: { role: string }) => u.role === 'ADMIN')).toBe(true);
  });

  it('לקוח לא יכול להוסיף מנהל או לראות מנהלים (403); מבקר (401)', async () => {
    const { auth } = await createUser('CUSTOMER');
    expect((await api().post('/api/admins').set(auth).send(newAdmin)).status).toBe(403);
    expect((await api().get('/api/admins').set(auth)).status).toBe(403);
    expect((await api().get('/api/admins')).status).toBe(401);
    expect(await prisma.user.count({ where: { role: 'ADMIN' } })).toBe(0);
  });

  it('אימות סיסמה שונה => 400; אימייל קיים => 409', async () => {
    const { auth, user } = await createUser('ADMIN');
    expect((await api().post('/api/admins').set(auth).send({ ...newAdmin, confirmPassword: 'x' })).status).toBe(400);
    expect((await api().post('/api/admins').set(auth).send({ ...newAdmin, email: user.email })).status).toBe(409);
  });
});
