# VELLORA HOTEL – מדריך API לצד ה־React

המסמך הזה מסביר איך צד ה־React מתקשר עם השרת: אילו כתובות, מה שולחים, מה מקבלים ומה עושים בשגיאות.
**אין כאן קוד React** – את זה את כותבת בעצמך. יש רק תיאור הבקשות ודוגמאות JSON.

התיעוד האינטראקטיבי המלא: `<BASE_URL>/api-docs` (Swagger).

---

## 1. כתובת השרת (Base URL)

| סביבה | Base URL |
|---|---|
| מחשב מקומי | `http://localhost:4000` |
| אחרי העלאה ל־Render | `https://<שם-השירות>.onrender.com` |

כל הנתיבים מתחילים ב־`/api`. לדוגמה: `GET https://vellora-hotel-api.onrender.com/api/rooms`

💡 מומלץ לשמור את ה־Base URL במשתנה סביבה של פרויקט ה־React (ב־Vite: קובץ `.env` עם משתנה שמתחיל ב־`VITE_`), כדי שלא תצטרכי לשנות קוד כשעוברים מהמחשב לאינטרנט.

⚠️ כתובת אתר ה־React חייבת להופיע במשתנה `CORS_ORIGINS` בשרת, אחרת הדפדפן יחסום את הבקשות.

---

## 2. התחברות ו־Token

1. המשתמש נרשם (`POST /api/auth/register`) או מתחבר (`POST /api/auth/login`).
2. השרת מחזיר `token` (JWT) ו־`user`.
3. שומרים את ה־`token` בצד הלקוח (למשל ב־localStorage), ואת `user` – כדי לדעת את השם והתפקיד.
4. **בכל בקשה למסלול מוגן** שולחים כותרת (Header):
   ```
   Authorization: Bearer <token>
   ```
5. ה־Token תקף **יום אחד**. אחרי זה השרת מחזיר `401`, וצריך להתחבר מחדש.
6. בטעינת האפליקציה, אם יש Token שמור – אפשר לקרוא ל־`GET /api/auth/me`:
   - `200` ← המשתמש עדיין מחובר, ומקבלים את הפרטים העדכניים שלו.
   - `401` ← ה־Token פג. מוחקים אותו ומציגים כמשתמש לא מחובר.
7. **התנתקות** = פשוט למחוק את ה־Token מהצד שלך. אין Endpoint להתנתקות.

**התפקיד** נמצא ב־`user.role`: `CUSTOMER` (לקוח) או `ADMIN` (מנהל). לפיו מחליטים אילו מסכים וכפתורים להציג.
⚠️ הסתרת כפתור ב־React היא רק לנוחות. האבטחה האמיתית בשרת – גם אם מישהו ישלח בקשה בעצמו, השרת יחזיר `403`.

---

## 3. רשימת ה־Endpoints

| # | Method | URL | מה עושה | מי |
|---|---|---|---|---|
| 1 | GET | `/api/health` | בדיקת שרת | כולם |
| 2 | POST | `/api/auth/register` | הרשמת לקוח | כולם |
| 3 | POST | `/api/auth/login` | התחברות | כולם |
| 4 | GET | `/api/auth/me` | מי מחובר | מחובר |
| 5 | GET | `/api/rooms` | רשימת חדרים + סינון | כולם (מנהל רואה יותר) |
| 6 | GET | `/api/rooms/:id` | פרטי חדר | כולם |
| 7 | POST | `/api/rooms` | הוספת חדר | מנהל |
| 8 | PATCH | `/api/rooms/:id` | עריכת חדר | מנהל |
| 9 | DELETE | `/api/rooms/:id` | מחיקת חדר | מנהל |
| 10 | POST | `/api/bookings` | שליחת בקשת הזמנה | לקוח |
| 11 | GET | `/api/bookings/my` | ההזמנות שלי | לקוח |
| 12 | GET | `/api/bookings/:id` | פרטי הזמנה | לקוח (שלו) / מנהל |
| 13 | GET | `/api/bookings` | כל ההזמנות + סינון | מנהל |
| 14 | PATCH | `/api/bookings/:id/status` | אישור / דחייה | מנהל |
| 15 | GET | `/api/admins` | רשימת מנהלים | מנהל |
| 16 | POST | `/api/admins` | הוספת מנהל | מנהל |

---

## 4. אילו Endpoints צריך בכל מסך

| מסך | Endpoints |
|---|---|
| **רשימת חדרים (דף הבית)** | `GET /api/rooms` עם פרמטרי סינון |
| **פרטי חדר** | `GET /api/rooms/:id` |
| **הרשמה** | `POST /api/auth/register` |
| **התחברות** | `POST /api/auth/login` |
| **טעינת האפליקציה** | `GET /api/auth/me` (אם יש Token שמור) |
| **טופס בקשת הזמנה** | `GET /api/rooms/:id` (תמונה ופרטים) ← `POST /api/bookings` |
| **ההזמנות שלי** | `GET /api/bookings/my` |
| **ניהול הזמנות** | `GET /api/bookings` ← `PATCH /api/bookings/:id/status` |
| **ניהול חדרים** | `GET /api/rooms` (כמנהל, עם Token) ← `DELETE /api/rooms/:id` |
| **טופס חדר – הוספה** | `POST /api/rooms` |
| **טופס חדר – עריכה** | `GET /api/rooms/:id` (למילוי הטופס) ← `PATCH /api/rooms/:id` |
| **ניהול מנהלים** | `GET /api/admins` ← `POST /api/admins` |

---

## 5. מבני הנתונים

### User – משתמש
```json
{
  "id": "0d6a1c8e-5f3b-4a2d-9e71-8c4b2a6f1d30",
  "fullName": "יוסי כהן",
  "email": "yossi@example.com",
  "role": "CUSTOMER",
  "createdAt": "2026-10-19T08:00:00.000Z"
}
```

### Room – חדר
```json
{
  "id": "6f1c2a9e-3b7d-4f0a-9c51-2d8e4b6a7f10",
  "roomNumber": 301,
  "name": "סוויטת הנוף",
  "type": "SUITE",
  "pricePerNight": 1350,
  "maxGuests": 4,
  "floor": 3,
  "description": "סוויטה עם סלון נפרד ונוף פתוח לעיר.",
  "imageUrl": "https://pub-xxxxxxxx.r2.dev/rooms/0b6c1f0e-....jpg",
  "status": "AVAILABLE",
  "createdAt": "2026-10-19T08:00:00.000Z",
  "updatedAt": "2026-10-19T08:00:00.000Z"
}
```
- `imageUrl` – כתובת מלאה, מכניסים ישר לתגית תמונה. יכול להיות `null` (אין תמונה) – כדאי להציג תמונת ברירת מחדל.
- `description` יכול להיות `null`.

### Booking – הזמנה
```json
{
  "id": "a3e9b1c4-7d2f-4e8a-b5c6-1f0d9e8c7b6a",
  "status": "PENDING",
  "checkIn": "2026-11-10",
  "checkOut": "2026-11-13",
  "nights": 3,
  "pricePerNight": 1350,
  "totalPrice": 4050,
  "guestName": "אברהם כהן",
  "phone": "050-1234567",
  "notes": "נשמח לחדר בקומה גבוהה",
  "room": {
    "id": "6f1c2a9e-3b7d-4f0a-9c51-2d8e4b6a7f10",
    "roomNumber": 301,
    "name": "סוויטת הנוף",
    "type": "SUITE",
    "maxGuests": 4,
    "floor": 3,
    "imageUrl": "https://pub-xxxxxxxx.r2.dev/rooms/0b6c1f0e-....jpg",
    "deleted": false
  },
  "customer": { "id": "0d6a1c8e-...", "fullName": "יוסי כהן", "email": "yossi@example.com" },
  "decidedBy": null,
  "decidedAt": null,
  "createdAt": "2026-10-19T08:30:00.000Z",
  "updatedAt": "2026-10-19T08:30:00.000Z"
}
```
- `room.deleted = true` ← החדר נמחק אחרי ההזמנה. נשארים רק `roomNumber` ו־`name`, ושאר השדות `null`.
- `decidedBy` / `decidedAt` – מי ומתי אישר או דחה. `null` כל עוד ממתינה.
- `pricePerNight` – המחיר ברגע שליחת הבקשה (גם אם המחיר של החדר השתנה אחר כך).

### רשימות (עם עימוד)
`GET /api/rooms`, `GET /api/bookings`, `GET /api/bookings/my` מחזירים:
```json
{ "items": [ ... ], "page": 1, "limit": 10, "total": 23, "totalPages": 3 }
```

### ערכי בחירה (להצגה בעברית)

| שדה | ערך | להציג |
|---|---|---|
| `role` | `CUSTOMER` / `ADMIN` | לקוח / מנהל |
| `type` | `SINGLE` / `DOUBLE` / `FAMILY` / `SUITE` | יחיד / זוגי / משפחתי / סוויטה |
| `status` (חדר) | `AVAILABLE` / `UNAVAILABLE` | זמין / לא זמין |
| `status` (הזמנה) | `PENDING` / `APPROVED` / `REJECTED` | ממתינה לאישור / מאושרת / נדחתה |

**תאריכים:** תמיד במבנה `YYYY-MM-DD` (למשל `2026-11-10`), גם בשליחה וגם בקבלה. זה בדיוק הפורמט של שדה תאריך בדפדפן.

---

## 6. פירוט הבקשות

### הרשמה – `POST /api/auth/register`
**Body (JSON) – כל השדות חובה:**
```json
{ "fullName": "יוסי כהן", "email": "yossi@example.com", "password": "Hotel2026", "confirmPassword": "Hotel2026" }
```
| שדה | כללים |
|---|---|
| `fullName` | 2–100 תווים |
| `email` | אימייל תקין |
| `password` | 8–72 תווים, לפחות אות אחת באנגלית וספרה אחת |
| `confirmPassword` | זהה ל־`password` |

**הצלחה `201`:** `{ "token": "...", "user": { ...User } }` – המשתמש מחובר מיד.
**שגיאות:** `400` שדות לא תקינים · `409` `EMAIL_TAKEN`

### התחברות – `POST /api/auth/login`
```json
{ "email": "yossi@example.com", "password": "Hotel2026" }
```
**הצלחה `200`:** `{ "token": "...", "user": { ...User } }`
**שגיאות:** `400` חסר שדה · `401` "אימייל או סיסמה שגויים" · `429` יותר מדי ניסיונות

### מי מחובר – `GET /api/auth/me` 🔒
**הצלחה `200`:** `{ "user": { ...User } }` · **שגיאה:** `401`

---

### רשימת חדרים – `GET /api/rooms`
ציבורי. **Token לא חובה** – אבל אם מנהל שולח Token, הוא רואה גם חדרים לא זמינים.

**פרמטרים ב־Query String (כולם רשות):**

| פרמטר | דוגמה | הסבר |
|---|---|---|
| `checkIn` + `checkOut` | `2026-11-10` / `2026-11-13` | רק חדרים פנויים בתאריכים. חייבים לשלוח את שניהם |
| `type` | `FAMILY` | סוג חדר |
| `minPrice` / `maxPrice` | `400` / `900` | טווח מחיר ללילה |
| `guests` | `3` | חדרים שמתאימים לפחות ל־3 אורחים |
| `search` | `סוויטה` | חיפוש בשם החדר |
| `status` | `UNAVAILABLE` | **מנהל בלבד** |
| `sort` | `price_asc` | `roomNumber_asc` (ברירת מחדל) · `price_asc` · `price_desc` · `name_asc` |
| `page` / `limit` | `1` / `12` | עימוד. `limit` עד 50 |

**דוגמה:**
```
GET /api/rooms?checkIn=2026-11-10&checkOut=2026-11-13&type=DOUBLE&sort=price_asc
```
**הצלחה `200`:** `{ "items": [Room...], "page", "limit", "total", "totalPages" }`
**שגיאות `400`:** רק אחד מהתאריכים, יציאה לפני כניסה, כניסה בעבר, ערך מיון לא קיים.

💡 **להעברת תאריכים מהסינון לטופס ההזמנה** – זה בצד ה־React (למשל דרך פרמטרים בכתובת או State). השרת יבדוק שוב בעת השליחה שהחדר באמת פנוי.

### פרטי חדר – `GET /api/rooms/:id`
**הצלחה `200`:** Room · **שגיאות:** `400` מזהה לא תקין · `404` לא נמצא (או לא זמין, למי שאינו מנהל)

### הוספת חדר – `POST /api/rooms` 🔒 מנהל
⚠️ **נשלח כ־`multipart/form-data`** (טופס עם קובץ), לא JSON. בדפדפן משתמשים באובייקט `FormData`, מוסיפים כל שדה בשמו, ואת הקובץ בשדה `image`. **לא** מגדירים בעצמך כותרת `Content-Type` – הדפדפן מוסיף אותה לבד. רק `Authorization`.

| שדה | חובה | כללים |
|---|---|---|
| `roomNumber` | ✅ | מספר שלם 1–9999, ייחודי |
| `name` | ✅ | 2–100 תווים |
| `type` | ✅ | `SINGLE` / `DOUBLE` / `FAMILY` / `SUITE` |
| `pricePerNight` | ✅ | גדול מ־0, עד 2 ספרות אחרי הנקודה |
| `maxGuests` | ✅ | 1–10 |
| `floor` | ✅ | 0–100 |
| `description` | | עד 1000 תווים |
| `status` | | `AVAILABLE` (ברירת מחדל) / `UNAVAILABLE` |
| `image` | | קובץ JPG / PNG / WEBP, עד 5MB |

**הצלחה `201`:** Room (כולל `imageUrl`)
**שגיאות:** `400` שדות או תמונה לא תקינים · `401` · `403` · `409` `ROOM_NUMBER_TAKEN` · `413` `FILE_TOO_LARGE`

💡 אם אין תמונה – אפשר לשלוח גם JSON רגיל עם אותם שדות.

### עריכת חדר – `PATCH /api/rooms/:id` 🔒 מנהל
כמו הוספה (`multipart/form-data`), אבל **כל השדות רשות** – שולחים רק את מה שהשתנה.
- תמונה חדשה ב־`image` מחליפה את הישנה.
- `description` ריק מוחק את התיאור.
- סימון חדר כ"בשיפוצים": שולחים רק `status` = `UNAVAILABLE`.

**הצלחה `200`:** Room מעודכן · **שגיאות:** `400` (גם אם לא נשלח אף שדה) · `401` · `403` · `404` · `409` · `413`

### מחיקת חדר – `DELETE /api/rooms/:id` 🔒 מנהל
**הצלחה `204`** – בלי גוף תשובה.
**שגיאות:** `401` · `403` · `404` · `409` `ROOM_HAS_ACTIVE_BOOKINGS` – יש הזמנה ממתינה או מאושרת שעוד לא הסתיימה. ההודעה כוללת את התאריכים; כדאי להציג אותה כמו שהיא.

---

### שליחת בקשת הזמנה – `POST /api/bookings` 🔒 לקוח
```json
{
  "roomId": "6f1c2a9e-3b7d-4f0a-9c51-2d8e4b6a7f10",
  "checkIn": "2026-11-10",
  "checkOut": "2026-11-13",
  "phone": "050-1234567",
  "guestName": "אברהם כהן",
  "notes": "נשמח לחדר בקומה גבוהה"
}
```
| שדה | חובה | כללים |
|---|---|---|
| `roomId` | ✅ | מזהה חדר |
| `checkIn` | ✅ | `YYYY-MM-DD`, מהיום ועד שנה קדימה |
| `checkOut` | ✅ | אחרי `checkIn`, עד 30 לילות |
| `phone` | ✅ | 9–20 תווים: ספרות, מקף, רווח, `+` בהתחלה |
| `guestName` | | 2–100 תווים. ריק ← שם המשתמש המחובר |
| `notes` | | עד 500 תווים |

**לא שולחים** מחיר, סטטוס או מזהה משתמש – השרת קובע אותם בעצמו (ומתעלם אם נשלחו).

💡 **להצגת המחיר הכולל בטופס לפני השליחה:** מספר הלילות × `pricePerNight` של החדר. השרת מחשב את אותו דבר.

**הצלחה `201`:** Booking עם `"status": "PENDING"`
**שגיאות:** `400` · `401` · `403` (מנהל לא שולח בקשות) · `404` החדר לא קיים או לא זמין · `409` `ROOM_NOT_AVAILABLE_FOR_DATES` – מישהו כבר ביקש את התאריכים

### ההזמנות שלי – `GET /api/bookings/my` 🔒 לקוח
| פרמטר | ערכים |
|---|---|
| `status` | `PENDING` / `APPROVED` / `REJECTED` |
| `sort` | `createdAt_desc` (ברירת מחדל) · `createdAt_asc` · `checkIn_asc` · `checkIn_desc` |
| `page` / `limit` | עימוד |

**הצלחה `200`:** רשימה עם עימוד. כל הזמנה כוללת `room.imageUrl` ופרטי החדר.

### פרטי הזמנה – `GET /api/bookings/:id` 🔒
לקוח – רק הזמנה שלו (הזמנה של מישהו אחר מחזירה `404`). מנהל – כל הזמנה.

### כל ההזמנות – `GET /api/bookings` 🔒 מנהל
| פרמטר | דוגמה | הסבר |
|---|---|---|
| `status` | `PENDING` | |
| `from` / `to` | `2026-11-01` / `2026-11-30` | הזמנות שהשהות שלהן נוגעת בטווח |
| `roomId` | מזהה | הזמנות של חדר מסוים |
| `search` | `כהן` | בשם הלקוח, באימייל או בשם האורח |
| `sort` | `status` (ברירת מחדל: ממתינות קודם) · `createdAt_desc` · `createdAt_asc` · `checkIn_asc` · `checkIn_desc` | |
| `page` / `limit` | | |

### אישור / דחייה – `PATCH /api/bookings/:id/status` 🔒 מנהל
```json
{ "status": "APPROVED" }
```
או `{ "status": "REJECTED" }`.
**הצלחה `200`:** Booking מעודכן (עם `decidedBy`, `decidedAt`).
**שגיאות:** `400` ערך לא תקין · `404` · `409` `BOOKING_ALREADY_DECIDED` – כבר אושרה או נדחתה. ההחלטה סופית.

💡 כפתורי "אישור" ו"דחייה" צריכים להופיע רק בהזמנות עם `status = PENDING`.

---

### רשימת מנהלים – `GET /api/admins` 🔒 מנהל
**הצלחה `200`:** `{ "items": [User...] }`

### הוספת מנהל – `POST /api/admins` 🔒 מנהל
אותו Body בדיוק כמו בהרשמה (`fullName`, `email`, `password`, `confirmPassword`).
**הצלחה `201`:** User עם `"role": "ADMIN"` · **שגיאות:** `400` · `401` · `403` · `409` `EMAIL_TAKEN`

---

## 7. שגיאות

כל שגיאה חוזרת **באותו מבנה**:
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "הנתונים שנשלחו אינם תקינים",
    "details": [
      { "field": "email", "message": "כתובת אימייל לא תקינה" },
      { "field": "confirmPassword", "message": "הסיסמאות אינן תואמות" }
    ]
  }
}
```
- `message` – בעברית, אפשר להציג למשתמש כמו שהיא.
- `details` – מופיע רק בשגיאות ולידציה. `field` הוא שם השדה בטופס – אפשר להציג כל הודעה ליד השדה שלה.

| קוד HTTP | `code` | מה זה | מה לעשות ב־React |
|---|---|---|---|
| 400 | `BAD_REQUEST`, `INVALID_JSON`, `BAD_UPLOAD` | נתונים לא תקינים | להציג את `details` ליד השדות |
| 401 | `UNAUTHORIZED` | לא מחובר / Token פג | למחוק Token ולהעביר להתחברות |
| 403 | `FORBIDDEN` | אין הרשאה | להציג "אין הרשאה" |
| 404 | `NOT_FOUND` | לא נמצא | להציג "לא נמצא" |
| 409 | `EMAIL_TAKEN`, `ROOM_NUMBER_TAKEN`, `ROOM_NOT_AVAILABLE_FOR_DATES`, `ROOM_HAS_ACTIVE_BOOKINGS`, `BOOKING_ALREADY_DECIDED`, `DUPLICATE` | התנגשות | להציג את `message` |
| 413 | `FILE_TOO_LARGE`, `PAYLOAD_TOO_LARGE` | קובץ גדול מדי | "התמונה גדולה מדי (עד 5MB)" |
| 429 | `TOO_MANY_REQUESTS` | יותר מדי ניסיונות התחברות | לבקש לחכות כמה דקות |
| 500 | `INTERNAL_ERROR` | תקלה בשרת | הודעה כללית, לנסות שוב |
| 503 | – | מסד הנתונים לא זמין (רק ב־health) | – |

⏳ **שרת חינמי ב־Render:** הבקשה הראשונה אחרי זמן בלי שימוש יכולה לקחת כדקה. כדאי להציג מצב טעינה ולא להניח שהשרת נפל.

---

## 8. סיכום הרשאות

| פעולה | מבקר | לקוח | מנהל |
|---|:---:|:---:|:---:|
| צפייה בחדרים זמינים וסינון | ✅ | ✅ | ✅ |
| צפייה בחדרים לא זמינים | ❌ | ❌ | ✅ |
| הרשמה / התחברות | ✅ | – | – |
| שליחת בקשת הזמנה | ❌ (401) | ✅ | ❌ (403) |
| ההזמנות שלי | ❌ (401) | ✅ | ❌ (403) |
| פרטי הזמנה | ❌ (401) | רק שלו | ✅ |
| כל ההזמנות, אישור / דחייה | ❌ (401) | ❌ (403) | ✅ |
| הוספה / עריכה / מחיקת חדר | ❌ (401) | ❌ (403) | ✅ |
| מנהלים – רשימה והוספה | ❌ (401) | ❌ (403) | ✅ |

## 9. משתמשי הדגמה

**בהרצה מקומית** (אחרי `npm run db:seed`):

| תפקיד | אימייל | סיסמה |
|---|---|---|
| מנהל | `admin@vellora.test` | `Admin1234` |
| לקוח | `yossi@vellora.test` | `Customer1234` |
| לקוח | `moshe@vellora.test` | `Customer1234` |

**בשרת ב־Render:** המנהל הוא מה שהגדרת ב־`INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`. לקוחות – נרשמים דרך `POST /api/auth/register`.
