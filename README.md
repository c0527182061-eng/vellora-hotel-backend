# VELLORA HOTEL – צד שרת (Backend)

שרת API למערכת בקשות הזמנה של בית מלון.
לקוחות מוצאים חדר פנוי ושולחים בקשת הזמנה, והמנהל מאשר או דוחה ומנהל את החדרים.

> **בפעם הראשונה? התחילי מהקובץ [`START-HERE.md`](START-HERE.md)** – מדריך צעד־אחר־צעד להעלאה לאינטרנט.
> לכתיבת צד ה־React: [`FRONTEND-API-GUIDE.md`](FRONTEND-API-GUIDE.md).

---

## טכנולוגיות

| תחום | כלי |
|---|---|
| שפה וסביבה | Node.js 22 (LTS), TypeScript במצב strict |
| שרת | Express 5 |
| מסד נתונים | PostgreSQL + Prisma ORM 7 (עם `@prisma/adapter-pg`) |
| ולידציה | Zod 4 (הודעות שגיאה בעברית) |
| התחברות | JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`) |
| תמונות | Cloudflare R2 (חלופה: Cloudinary; לפיתוח: תיקייה מקומית) |
| תיעוד | Swagger UI / OpenAPI 3 |
| בדיקות | Vitest + Supertest מול PostgreSQL אמיתי |

## מבנה התיקיות

```
vellora-hotel-backend/
├── src/
│   ├── server.ts              ← נקודת הכניסה: מפעיל את השרת
│   ├── app.ts                 ← הרכבת Express: CORS, Swagger, נתיבים, שגיאות
│   ├── config/env.ts          ← קריאה ובדיקה של משתני הסביבה
│   ├── db/prisma.ts           ← חיבור למסד הנתונים
│   ├── lib/                   ← כלים: JWT וסיסמאות, תאריכים, שגיאות, Zod
│   ├── middleware/            ← אימות (401), הרשאות (403), ולידציה, העלאת תמונה, טיפול בשגיאות
│   ├── storage/               ← העלאת תמונות: R2 / Cloudinary / local
│   ├── modules/               ← כל תחום בתיקייה משלו:
│   │   ├── auth/              │   routes → controller → service + schemas
│   │   ├── rooms/
│   │   ├── bookings/
│   │   ├── admins/
│   │   ├── users/
│   │   └── health/
│   ├── bootstrap/             ← יצירת מנהל ראשון וחדרי הדגמה בעלייה
│   ├── docs/openapi.ts        ← תיעוד Swagger
│   └── types/                 ← הרחבת טיפוסים של Express
├── prisma/
│   ├── schema.prisma          ← הגדרת הטבלאות
│   ├── migrations/            ← יצירת הטבלאות במסד הנתונים
│   └── seed.ts                ← נתוני הדגמה לפיתוח
├── tests/                     ← בדיקות אוטומטיות
├── docs/                      ← openapi.json + מסמך האפיון
├── scripts/export-openapi.ts
├── prisma.config.ts
├── render.yaml                ← הגדרות פריסה ל־Render
├── .env.example               ← תבנית למשתני סביבה
├── START-HERE.md              ← מדריך העלאה לאינטרנט
└── FRONTEND-API-GUIDE.md      ← מדריך חיבור React לשרת
```

**איך בקשה עוברת בשרת:**
`route` (כתובת + הרשאות + ולידציה) ← `controller` (קורא מהבקשה ומחזיר תשובה) ← `service` (הלוגיקה העסקית ומסד הנתונים).

## הרצה על המחשב

דרישות: [Node.js 22](https://nodejs.org) ו־PostgreSQL (מקומי, או מסד חינמי ב־Supabase).

```bash
npm install                 # מתקין תלויות ומייצר את Prisma Client
cp .env.example .env        # ואז לערוך את .env: DATABASE_URL ו־JWT_SECRET
npm run db:deploy           # יוצר את הטבלאות
npm run db:seed             # נתוני הדגמה
npm run dev                 # השרת עולה על http://localhost:4000
```

פתחי בדפדפן:
- http://localhost:4000/api/health
- http://localhost:4000/api-docs

### משתמשי הדגמה (רק בפיתוח, מ־`npm run db:seed`)

| תפקיד | אימייל | סיסמה |
|---|---|---|
| מנהל | `admin@vellora.test` | `Admin1234` |
| לקוח | `yossi@vellora.test` | `Customer1234` |
| לקוח | `moshe@vellora.test` | `Customer1234` |

ה־Seed לא יוצר את המשתמשים האלה בפרודקשן. בפרודקשן המנהל הראשון נוצר מ־`INITIAL_ADMIN_EMAIL` ו־`INITIAL_ADMIN_PASSWORD`.

## פקודות

| פקודה | מה עושה |
|---|---|
| `npm run dev` | הפעלה לפיתוח, עם רענון אוטומטי |
| `npm run build` | קומפילציה ל־`dist/` |
| `npm start` | הפעלת הגרסה המקומפלת |
| `npm run start:prod` | Migrations ואז הפעלה (משמש את Render) |
| `npm run typecheck` | בדיקת TypeScript |
| `npm test` | בדיקות אוטומטיות (דורש מסד בדיקות, ראי למטה) |
| `npm run check` | הכול יחד: Prisma validate, Typecheck, Build, בדיקות |
| `npm run db:migrate` | יצירת Migration חדשה אחרי שינוי ב־`schema.prisma` |
| `npm run db:deploy` | הרצת Migrations קיימות |
| `npm run db:seed` | נתוני הדגמה |
| `npm run openapi:export` | עדכון `docs/openapi.json` |

## בדיקות

הבדיקות רצות מול **מסד PostgreSQL נפרד** – לא מול מסד הפיתוח.
ברירת המחדל: `postgresql://postgres:postgres@localhost:5432/vellora_test`.
אפשר לשנות דרך המשתנה `TEST_DATABASE_URL` (השם חייב להכיל `test` – הגנה מפני מחיקה בטעות).

```bash
createdb vellora_test       # פעם אחת
npm test
```

לפני הרצה, המסד נבנה מחדש מתוך קובצי ה־Migrations, ולפני כל בדיקה הטבלאות מתרוקנות.

## אבטחה – בקצרה

- סיסמאות נשמרות כ־bcrypt Hash ולא מוחזרות לעולם.
- זהות המשתמש נקבעת **רק** לפי ה־Token. שדות כמו `userId`, `role`, `status` או `totalPrice` שנשלחים מהלקוח – מתעלמים מהם.
- לקוח שמבקש הזמנה של לקוח אחר מקבל 404, כדי לא לחשוף שהיא קיימת.
- שתי בקשות הזמנה בו־זמניות לאותו חדר: נעילה במסד הנתונים מבטיחה שרק אחת עוברת.
- סוג התמונה נבדק לפי תוכן הקובץ, לא לפי השם. עד 5MB.
- הגבלת ניסיונות ב־login ו־register (30 ל־15 דקות).
- CORS מוגבל לכתובות ב־`CORS_ORIGINS`.

## מגבלות ידועות

- בעליית שרת חינמי ב־Render הבקשה הראשונה איטית (כדקה) – השרת "מתעורר".
- `STORAGE_PROVIDER=local` מתאים רק למחשב: ב־Render קבצים מקומיים נמחקים.
- אין שליחת אימיילים, תשלומים או ביטול הזמנה על ידי הלקוח – לפי האפיון.
