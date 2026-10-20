import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma';
import { api, createRoom, createUser, day, resetDb } from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const req = (roomId: string, from: number, to: number, extra: Record<string, unknown> = {}) => ({
  roomId,
  checkIn: day(from),
  checkOut: day(to),
  phone: '050-1234567',
  ...extra,
});

describe('POST /api/bookings – בקשת הזמנה', () => {
  it('לקוח שולח בקשה: PENDING, מחיר מחושב בשרת, שם הלקוח כברירת מחדל', async () => {
    const { user, auth } = await createUser('CUSTOMER', { fullName: 'יוסי כהן' });
    const room = await createRoom({ pricePerNight: 450.5, name: 'חדר הגן', roomNumber: 12 });
    const res = await api().post('/api/bookings').set(auth).send(req(room.id, 5, 8, { totalPrice: 1, userId: 'hack', status: 'APPROVED' }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: 'PENDING',
      nights: 3,
      pricePerNight: 450.5,
      totalPrice: 1351.5,
      guestName: 'יוסי כהן',
      checkIn: day(5),
      checkOut: day(8),
      room: { id: room.id, roomNumber: 12, name: 'חדר הגן', deleted: false },
      customer: { id: user.id },
    });
  });

  it('הזמנה על שם אורח אחר + הערות', async () => {
    const { auth } = await createUser('CUSTOMER');
    const room = await createRoom();
    const res = await api().post('/api/bookings').set(auth).send(req(room.id, 1, 2, { guestName: 'אברהם לוי', notes: 'מיטת תינוק' }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ guestName: 'אברהם לוי', notes: 'מיטת תינוק' });
  });

  it('אפשר להזמין החל מהיום', async () => {
    const { auth } = await createUser('CUSTOMER');
    const room = await createRoom();
    expect((await api().post('/api/bookings').set(auth).send(req(room.id, 0, 1))).status).toBe(201);
  });

  it('חפיפה עם בקשה ממתינה => 409, אבל צמוד (יציאה=כניסה) מותר', async () => {
    const a = await createUser('CUSTOMER');
    const b = await createUser('CUSTOMER');
    const room = await createRoom();
    expect((await api().post('/api/bookings').set(a.auth).send(req(room.id, 10, 13))).status).toBe(201);
    const overlap = await api().post('/api/bookings').set(b.auth).send(req(room.id, 12, 15));
    expect(overlap.status).toBe(409);
    expect(overlap.body.error.code).toBe('ROOM_NOT_AVAILABLE_FOR_DATES');
    expect((await api().post('/api/bookings').set(b.auth).send(req(room.id, 13, 15))).status).toBe(201);
    expect((await api().post('/api/bookings').set(b.auth).send(req(room.id, 8, 10))).status).toBe(201);
  });

  it('בקשות בו־זמניות לאותם תאריכים – רק אחת מצליחה', async () => {
    const room = await createRoom();
    const users = await Promise.all(Array.from({ length: 6 }, () => createUser('CUSTOMER')));
    const results = await Promise.all(users.map((u) => api().post('/api/bookings').set(u.auth).send(req(room.id, 20, 23))));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(5);
    expect(await prisma.booking.count()).toBe(1);
  });

  it('ולידציה: עבר, יציאה לפני כניסה, יותר מ־30 לילות, יותר משנה, טלפון', async () => {
    const { auth } = await createUser('CUSTOMER');
    const room = await createRoom();
    const send = (body: object) => api().post('/api/bookings').set(auth).send(body);
    expect((await send(req(room.id, -1, 2))).status).toBe(400);
    expect((await send(req(room.id, 5, 5))).status).toBe(400);
    expect((await send(req(room.id, 5, 40))).status).toBe(400);
    expect((await send(req(room.id, 400, 402))).status).toBe(400);
    expect((await send(req(room.id, 5, 6, { phone: 'abc' }))).status).toBe(400);
    expect((await send({ roomId: room.id })).status).toBe(400);
    expect(await prisma.booking.count()).toBe(0);
  });

  it('חדר לא זמין או לא קיים => 404', async () => {
    const { auth } = await createUser('CUSTOMER');
    const room = await createRoom({ status: 'UNAVAILABLE' });
    expect((await api().post('/api/bookings').set(auth).send(req(room.id, 3, 4))).status).toBe(404);
    expect((await api().post('/api/bookings').set(auth).send(req('7f3d1c2a-1111-4222-8333-944455556666', 3, 4))).status).toBe(404);
  });

  it('מנהל לא שולח בקשות הזמנה (403), מבקר צריך להתחבר (401)', async () => {
    const admin = await createUser('ADMIN');
    const room = await createRoom();
    expect((await api().post('/api/bookings').set(admin.auth).send(req(room.id, 3, 4))).status).toBe(403);
    expect((await api().post('/api/bookings').send(req(room.id, 3, 4))).status).toBe(401);
  });

  it('המחיר נשמר כפי שהיה ברגע הבקשה גם אם המחיר של החדר משתנה', async () => {
    const { auth } = await createUser('CUSTOMER');
    const room = await createRoom({ pricePerNight: 500 });
    const created = await api().post('/api/bookings').set(auth).send(req(room.id, 3, 5));
    await prisma.room.update({ where: { id: room.id }, data: { pricePerNight: 900 } });
    const res = await api().get(`/api/bookings/${created.body.id}`).set(auth);
    expect(res.body).toMatchObject({ pricePerNight: 500, totalPrice: 1000 });
  });
});

describe('פרטיות – לקוח רואה רק את ההזמנות שלו', () => {
  it('GET /api/bookings/my מחזיר רק את שלי, עם סינון לפי סטטוס', async () => {
    const me = await createUser('CUSTOMER');
    const other = await createUser('CUSTOMER');
    const room = await createRoom();
    const mine = await api().post('/api/bookings').set(me.auth).send(req(room.id, 1, 2));
    await api().post('/api/bookings').set(me.auth).send(req(room.id, 3, 4));
    await api().post('/api/bookings').set(other.auth).send(req(room.id, 5, 6));
    await prisma.booking.update({ where: { id: mine.body.id }, data: { status: 'APPROVED' } });

    const res = await api().get('/api/bookings/my').set(me.auth);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items.every((b: { customer: { id: string } }) => b.customer.id === me.user.id)).toBe(true);

    const approved = await api().get('/api/bookings/my?status=APPROVED').set(me.auth);
    expect(approved.body.items.map((b: { id: string }) => b.id)).toEqual([mine.body.id]);

    const sorted = await api().get('/api/bookings/my?sort=checkIn_desc').set(me.auth);
    expect(sorted.body.items.map((b: { checkIn: string }) => b.checkIn)).toEqual([day(3), day(1)]);
  });

  it('הזמנה של לקוח אחר => 404 (לא חושפים שהיא קיימת); מנהל רואה', async () => {
    const owner = await createUser('CUSTOMER');
    const stranger = await createUser('CUSTOMER');
    const admin = await createUser('ADMIN');
    const room = await createRoom();
    const created = await api().post('/api/bookings').set(owner.auth).send(req(room.id, 1, 2));
    expect((await api().get(`/api/bookings/${created.body.id}`).set(stranger.auth)).status).toBe(404);
    expect((await api().get(`/api/bookings/${created.body.id}`).set(owner.auth)).status).toBe(200);
    expect((await api().get(`/api/bookings/${created.body.id}`).set(admin.auth)).status).toBe(200);
  });

  it('לקוח לא יכול לראות את כל ההזמנות (403) ומנהל לא משתמש ב־/my (403)', async () => {
    const customer = await createUser('CUSTOMER');
    const admin = await createUser('ADMIN');
    expect((await api().get('/api/bookings').set(customer.auth)).status).toBe(403);
    expect((await api().get('/api/bookings/my').set(admin.auth)).status).toBe(403);
    expect((await api().get('/api/bookings/my')).status).toBe(401);
  });
});

describe('ניהול הזמנות – מנהל', () => {
  async function setup() {
    const admin = await createUser('ADMIN');
    const yossi = await createUser('CUSTOMER', { fullName: 'יוסי כהן', email: 'yossi@test.local' });
    const moshe = await createUser('CUSTOMER', { fullName: 'משה לוי', email: 'moshe@test.local' });
    const roomA = await createRoom({ roomNumber: 1 });
    const roomB = await createRoom({ roomNumber: 2 });
    const b1 = (await api().post('/api/bookings').set(yossi.auth).send(req(roomA.id, 5, 8))).body;
    const b2 = (await api().post('/api/bookings').set(moshe.auth).send(req(roomB.id, 20, 22, { guestName: 'אהרן גולד' }))).body;
    const b3 = (await api().post('/api/bookings').set(moshe.auth).send(req(roomA.id, 30, 31))).body;
    return { admin, yossi, moshe, roomA, roomB, b1, b2, b3 };
  }

  it('סינון לפי סטטוס, חדר, טווח תאריכים וחיפוש', async () => {
    const { admin, roomB, b1, b2, b3 } = await setup();
    await api().patch(`/api/bookings/${b3.id}/status`).set(admin.auth).send({ status: 'APPROVED' });
    const ids = async (qs: string) => (await api().get(`/api/bookings?${qs}`).set(admin.auth)).body.items.map((b: { id: string }) => b.id).sort();

    expect(await ids('')).toEqual([b1.id, b2.id, b3.id].sort());
    expect(await ids('status=PENDING')).toEqual([b1.id, b2.id].sort());
    expect(await ids(`roomId=${roomB.id}`)).toEqual([b2.id]);
    expect(await ids(`from=${day(6)}&to=${day(21)}`)).toEqual([b1.id, b2.id].sort());
    expect(await ids(`search=${encodeURIComponent('יוסי')}`)).toEqual([b1.id]);
    expect(await ids('search=MOSHE@')).toEqual([b2.id, b3.id].sort());
    expect(await ids(`search=${encodeURIComponent('גולד')}`)).toEqual([b2.id]);
  });

  it('ברירת מחדל: ממתינות קודם', async () => {
    const { admin, b1, b2, b3 } = await setup();
    await api().patch(`/api/bookings/${b1.id}/status`).set(admin.auth).send({ status: 'REJECTED' });
    const res = await api().get('/api/bookings').set(admin.auth);
    expect(res.body.items.map((b: { status: string }) => b.status)).toEqual(['PENDING', 'PENDING', 'REJECTED']);
    expect(res.body.items.slice(0, 2).map((b: { id: string }) => b.id).sort()).toEqual([b2.id, b3.id].sort());
    expect(res.body.items[0].customer).toHaveProperty('email');
  });

  it('אישור: רושם מי אישר ומתי, וההחלטה סופית', async () => {
    const { admin, b1 } = await setup();
    const res = await api().patch(`/api/bookings/${b1.id}/status`).set(admin.auth).send({ status: 'APPROVED' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'APPROVED', decidedBy: { id: admin.user.id } });
    expect(res.body.decidedAt).toBeTruthy();
    const again = await api().patch(`/api/bookings/${b1.id}/status`).set(admin.auth).send({ status: 'REJECTED' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('BOOKING_ALREADY_DECIDED');
  });

  it('דחייה משחררת את התאריכים להזמנה חדשה', async () => {
    const { admin, yossi, roomA, b1 } = await setup();
    const blocked = await api().post('/api/bookings').set(yossi.auth).send(req(roomA.id, 6, 7));
    expect(blocked.status).toBe(409);
    await api().patch(`/api/bookings/${b1.id}/status`).set(admin.auth).send({ status: 'REJECTED' });
    expect((await api().post('/api/bookings').set(yossi.auth).send(req(roomA.id, 6, 7))).status).toBe(201);
  });

  it('ערך סטטוס לא תקין => 400; לקוח => 403; הזמנה לא קיימת => 404', async () => {
    const { admin, yossi, b1 } = await setup();
    expect((await api().patch(`/api/bookings/${b1.id}/status`).set(admin.auth).send({ status: 'PENDING' })).status).toBe(400);
    expect((await api().patch(`/api/bookings/${b1.id}/status`).set(yossi.auth).send({ status: 'APPROVED' })).status).toBe(403);
    expect((await api().patch('/api/bookings/7f3d1c2a-1111-4222-8333-944455556666/status').set(admin.auth).send({ status: 'APPROVED' })).status).toBe(404);
  });
});
