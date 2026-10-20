/**
 * נתוני הדגמה לפיתוח על המחשב: npm run db:seed
 * אפשר להריץ שוב ושוב – לא נוצרות כפילויות.
 *
 * בפרודקשן (NODE_ENV=production) ה־Seed הזה לא יוצר משתמשים עם סיסמאות ידועות.
 * שם המנהל הראשון נוצר רק דרך INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD.
 */
import { env } from '../src/config/env';
import { prisma } from '../src/db/prisma';
import { hashPassword } from '../src/lib/auth';
import { addDays, nightsBetween, todayInHotel } from '../src/lib/dates';
import { demoRooms } from '../src/bootstrap/demoData';
import { ensureInitialAdmin } from '../src/bootstrap/startup';
import type { BookingStatus } from '../src/generated/prisma/client';

const DEMO_USERS = [
  { email: 'admin@vellora.test', fullName: 'מנהל המלון', role: 'ADMIN' as const, password: 'Admin1234' },
  { email: 'yossi@vellora.test', fullName: 'יוסי כהן', role: 'CUSTOMER' as const, password: 'Customer1234' },
  { email: 'moshe@vellora.test', fullName: 'משה לוי', role: 'CUSTOMER' as const, password: 'Customer1234' },
];

async function main() {
  if (env.NODE_ENV === 'production') {
    console.log('סביבת Production: לא נוצרים משתמשי הדגמה עם סיסמאות ידועות.');
    await ensureInitialAdmin();
    if ((await prisma.room.count()) === 0) await prisma.room.createMany({ data: demoRooms });
    return;
  }

  const users: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    const passwordHash = await hashPassword(u.password);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { fullName: u.fullName, role: u.role, passwordHash },
      create: { email: u.email, fullName: u.fullName, role: u.role, passwordHash },
    });
    users[u.email] = user.id;
  }

  const rooms: Record<number, { id: string; name: string; price: number }> = {};
  for (const r of demoRooms) {
    const room = await prisma.room.upsert({ where: { roomNumber: r.roomNumber }, update: r, create: r });
    rooms[r.roomNumber] = { id: room.id, name: room.name, price: r.pricePerNight };
  }

  if ((await prisma.booking.count()) === 0) {
    const today = todayInHotel();
    const admin = users['admin@vellora.test'];
    const plan: { user: string; room: number; from: number; to: number; status: BookingStatus; guestName?: string; notes?: string }[] = [
      { user: 'yossi@vellora.test', room: 102, from: 7, to: 10, status: 'PENDING', notes: 'נשמח לחדר בקומה נמוכה' },
      { user: 'yossi@vellora.test', room: 301, from: 20, to: 23, status: 'APPROVED', guestName: 'אברהם כהן' },
      { user: 'yossi@vellora.test', room: 201, from: 14, to: 16, status: 'REJECTED' },
      { user: 'yossi@vellora.test', room: 103, from: -10, to: -7, status: 'APPROVED' },
      { user: 'moshe@vellora.test', room: 202, from: 3, to: 6, status: 'PENDING', notes: 'נדרשת מיטת תינוק' },
      { user: 'moshe@vellora.test', room: 101, from: 30, to: 32, status: 'APPROVED' },
    ];
    for (const p of plan) {
      const checkIn = addDays(today, p.from);
      const checkOut = addDays(today, p.to);
      const nights = nightsBetween(checkIn, checkOut);
      const room = rooms[p.room];
      const decided = p.status !== 'PENDING';
      await prisma.booking.create({
        data: {
          userId: users[p.user],
          roomId: room.id,
          roomNumber: p.room,
          roomName: room.name,
          pricePerNight: room.price,
          checkIn,
          checkOut,
          nights,
          totalPrice: room.price * nights,
          guestName: p.guestName ?? DEMO_USERS.find((u) => u.email === p.user)!.fullName,
          phone: '050-1234567',
          notes: p.notes ?? null,
          status: p.status,
          decidedById: decided ? admin : null,
          decidedAt: decided ? new Date() : null,
        },
      });
    }
  }

  console.log('✅ נתוני ההדגמה מוכנים:');
  for (const u of DEMO_USERS) console.log(`   ${u.role === 'ADMIN' ? 'מנהל ' : 'לקוח '} ${u.email} / ${u.password}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
