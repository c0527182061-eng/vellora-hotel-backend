# 🏨 VELLORA HOTEL – מתחילים כאן

מדריך להעלאת השרת לאינטרנט, צעד אחר צעד. לא צריך ניסיון קודם.

**מה נעשה:**

| חלק | מה | שירות | עלות |
|---|---|---|---|
| א | שמירת הקוד באינטרנט | GitHub | חינם |
| ב | מסד נתונים | Supabase | חינם |
| ג | אחסון תמונות | Cloudflare R2 | חינם בתוך המכסה (דורש אמצעי תשלום בהפעלה) |
| ד | הפעלת השרת | Render | חינם |
| ה | בדיקה שהכול עובד | Swagger | – |

⏱️ זמן משוער: שעה עד שעה וחצי, בפעם הראשונה.

> ⚠️ **הערה חשובה על המסכים:** כתבתי את שמות הכפתורים לפי מה שידוע לי על האתרים האלה, אבל אין לי דרך לראות את המסך שלך, ואתרים משנים לפעמים את העיצוב. אם כפתור נקרא קצת אחרת – חפשי משהו דומה בשם. **הערכים שצריך להקליד** (פקודות, שמות משתנים) – מדויקים ולא משתנים.

> 🔒 **כלל זהב:** סיסמאות, מחרוזת החיבור למסד הנתונים ומפתחות R2 – לא שולחים לאף אחד, לא מעלים ל־GitHub ולא מצלמים מסך. שומרים אותם בקובץ פרטי במחשב, או במנהל סיסמאות.

---

## הכנה: פתיחת קובץ ה־ZIP

1. מצאי את הקובץ `vellora-hotel-backend.zip` בתיקיית ההורדות.
2. **Windows:** לחיצה ימנית ← **Extract All** (חלץ הכל) ← **Extract**.
   **Mac:** לחיצה כפולה על הקובץ.
3. נוצרת תיקייה בשם `vellora-hotel-backend`. בתוכה תראי תיקיות כמו `src`, `prisma`, `tests` וקבצים כמו `package.json`.

> 💡 קבצים שמתחילים בנקודה (כמו `.gitignore`, `.env.example`, `.node-version`) עלולים להיות מוסתרים.
> **Windows:** בסייר הקבצים ← **View** (תצוגה) ← סמני **Hidden items** (פריטים מוסתרים).
> **Mac:** בתוך התיקייה לחצי `Cmd + Shift + .` (נקודה).
> הם חשובים – ודאי שהם עולים ל־GitHub.

---

## חלק א – GitHub

### 1. פתיחת חשבון
1. היכנסי ל־https://github.com ← **Sign up**.
2. מלאי אימייל, סיסמה ושם משתמש, ואשרי את האימייל.

### 2. יצירת Repository
1. למעלה מימין: **+** ← **New repository**.
2. **Repository name:** `vellora-hotel-backend`
3. בחרי **Private** (מומלץ) או **Public**.
4. **אל** תסמני "Add a README file" – יש כבר אחד בפרויקט.
5. **Create repository**.

### 3. העלאת הקבצים דרך הדפדפן
1. בדף הריק של ה־Repository, לחצי על הקישור **uploading an existing file**.
2. פתחי את התיקייה `vellora-hotel-backend` במחשב, סמני **את כל מה שבתוכה** (`Ctrl + A` / `Cmd + A`) – כולל הקבצים המוסתרים – וגררי לחלון הדפדפן.
   ⚠️ גררי את **התוכן** של התיקייה, לא את התיקייה עצמה. `package.json` צריך להיות בשורש ה־Repository.
3. חכי שכל הקבצים יסיימו לעלות.
4. למטה, ב־**Commit changes**, לחצי **Commit changes**.

### 4. בדיקה
בדף הראשי של ה־Repository צריכים להופיע בשורש: `src`, `prisma`, `tests`, `docs`, `package.json`, `package-lock.json`, `render.yaml`, `.gitignore`, `.env.example`.

- ❌ אם יש תיקייה בשם `vellora-hotel-backend` ובתוכה הקבצים – העלית את התיקייה עצמה. מחקי והעלי שוב את התוכן.
- ❌ אם רואים קובץ בשם `.env` (בלי `.example`) – מחקי אותו מ־GitHub מיד (לחיצה על הקובץ ← ⋯ ← **Delete file**). ב־ZIP שקיבלת אין קובץ כזה.

---

## חלק ב – מסד נתונים ב־Supabase

> למה לא מסד הנתונים של Render? המסד החינמי של Render נמחק 30 יום אחרי יצירתו. ב־Supabase הוא נשמר.
> ⚠️ מגבלה: פרויקט חינמי ב־Supabase עלול להיכנס להשהיה אחרי תקופה ללא שימוש (בדרך כלל כשבוע). אם זה קורה – נכנסים ל־Supabase ולוחצים על **Restore / Resume**. כדאי להיכנס לפני ההגשה ולוודא שהוא פעיל.

### 1. פתיחת חשבון
1. היכנסי ל־https://supabase.com ← **Start your project** / **Sign up**.
2. הכי פשוט: **Continue with GitHub**.

### 2. יצירת מסד נתונים
1. **New project**.
2. **Name:** `vellora-hotel`
3. **Database Password:** לחצי **Generate a password** ו**העתיקי ושמרי אותה מיד** בקובץ פרטי. תצטרכי אותה בעוד רגע.
4. **Region:** בחרי אירופה, למשל **Central EU (Frankfurt)** – קרוב לישראל ול־Render.
5. **Create new project**. ההקמה לוקחת כמה דקות.

### 3. קבלת מחרוזת החיבור (Connection String)
1. בדף הפרויקט לחצי על הכפתור **Connect** (למעלה).
2. מצאי את **Session pooler** (פורט **5432**).
   ⚠️ חשוב: **Session pooler** ולא Direct connection – החיבור הישיר של Supabase לא תמיד עובד מ־Render.
3. העתיקי את המחרוזת. היא נראית בערך כך:
   ```
   postgresql://postgres.abcdefghijk:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
   ```
4. החליפי את `[YOUR-PASSWORD]` בסיסמה ששמרת בשלב 2 (בלי הסוגריים המרובעים).

> 💡 אם בסיסמה יש תווים מיוחדים כמו `@ # / ? %` – המחרוזת תישבר. הכי פשוט: ב־Supabase ← **Project Settings** ← **Database** ← **Reset database password**, ובחרי סיסמה עם אותיות וספרות בלבד.

### 4. שמירה בטוחה
שמרי את המחרוזת המלאה בקובץ פרטי במחשב בשם `DATABASE_URL`. **לא** ב־GitHub.

### 5. חיבור לשרת
המחרוזת תוזן ב־Render בחלק ד כמשתנה `DATABASE_URL`. הטבלאות ייווצרו לבד בהפעלה הראשונה.

---

## חלק ג – אחסון תמונות ב־Cloudflare R2

> 💳 Cloudflare מבקשת לחבר כרטיס אשראי או PayPal כדי להפעיל את R2. במסלול החינמי (10GB, מיליון העלאות בחודש) אין חיוב, ופרויקט כזה רחוק מאוד מהמכסה.
> 🔁 אין אפשרות? דלגי ל**נספח: Cloudinary** בסוף הקובץ – בלי כרטיס אשראי.

### 1. פתיחת חשבון והפעלת R2
1. https://dash.cloudflare.com/sign-up ← הרשמה ואישור אימייל.
2. בתפריט בצד: **R2 Object Storage**.
3. לחצי על הפעלת R2 (נקרא בדרך כלל **Purchase R2 Plan** / **Get started**), והזיני אמצעי תשלום. בחרי במסלול החינמי.

### 2. יצירת Bucket
1. **Create bucket**.
2. **Bucket name:** `vellora-hotel-images`
3. **Location:** Automatic.
4. **Create bucket**.

### 3. כתובת ציבורית לתמונות
1. בתוך ה־Bucket ← **Settings**.
2. ב־**Public Development URL** (נקרא גם **R2.dev subdomain**) ← **Enable** ← הקלידי `allow` לאישור.
3. העתיקי את הכתובת שמופיעה, למשל `https://pub-1a2b3c4d5e6f.r2.dev`.
   → זה הערך של **`R2_PUBLIC_URL`**.

> כתובת r2.dev מיועדת בעיקר לפיתוח ויש לה הגבלת קצב. לפרויקט גמר היא מספיקה.

### 4. מפתחות גישה לשרת
1. חזרי לעמוד הראשי של **R2 Object Storage**.
2. העתיקי את **Account ID** (מופיע בצד העמוד) → זה **`R2_ACCOUNT_ID`**.
3. לחצי **Manage API Tokens** (או **API** ← **Manage API tokens**) ← **Create API token** (בחרי Account API token אם שואלים).
4. **Token name:** `vellora-server`
5. **Permissions:** **Object Read & Write**.
6. **Specify bucket(s):** בחרי רק את `vellora-hotel-images`.
7. **Create API Token**.
8. העתיקי **מיד** (הם מוצגים פעם אחת בלבד!):
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`

שמרי את ארבעת הערכים בקובץ הפרטי:
```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_URL=https://pub-....r2.dev
```

---

## חלק ד – הפעלת השרת ב־Render

### 1. פתיחת חשבון וחיבור GitHub
1. https://render.com ← **Get Started** ← **GitHub**.
2. אשרי ל־Render גישה ל־GitHub. אם שואלים לאילו Repositories – אפשר לבחור רק את `vellora-hotel-backend`.

### 2. יצירת Web Service
1. בלוח הבקרה: **New** ← **Web Service**.
2. בחרי את ה־Repository `vellora-hotel-backend` ← **Connect**.
3. מלאי:

| שדה | ערך |
|---|---|
| **Name** | `vellora-hotel-api` |
| **Region** | `Frankfurt (EU Central)` |
| **Branch** | `main` |
| **Root Directory** | ריק |
| **Language / Runtime** | `Node` |
| **Build Command** | `npm ci --include=dev && npm run build` |
| **Start Command** | `npm run start:prod` |
| **Instance Type** | **Free** |

> ⚠️ ה־Build Command חייב לכלול `--include=dev`, אחרת הבנייה תיכשל.
> 💡 `npm run start:prod` מריץ את **Prisma Migrations** (יוצר/מעדכן טבלאות) ואז מפעיל את השרת. בשרת חינמי אין גישה ל־Shell, לכן זה קורה אוטומטית בכל הפעלה. זה בטוח – Migrations שכבר רצו לא רצות שוב.

### 3. משתני סביבה (Environment Variables)
באותו טופס, באזור **Environment Variables** (לפעמים תחת **Advanced**), לחצי **Add Environment Variable** לכל שורה:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `DATABASE_URL` | המחרוזת מ־Supabase (חלק ב) |
| `JWT_SECRET` | לחצי **Generate** אם יש כפתור כזה. אחרת – הקלידי מחרוזת אקראית ארוכה (40 תווים ומעלה, אותיות וספרות) |
| `JWT_EXPIRES_IN` | `1d` |
| `CORS_ORIGINS` | בינתיים `http://localhost:5173`. כשה־React יעלה לאינטרנט – הוסיפי את הכתובת שלו אחרי פסיק |
| `STORAGE_PROVIDER` | `r2` |
| `R2_ACCOUNT_ID` | מחלק ג |
| `R2_ACCESS_KEY_ID` | מחלק ג |
| `R2_SECRET_ACCESS_KEY` | מחלק ג |
| `R2_BUCKET` | `vellora-hotel-images` |
| `R2_PUBLIC_URL` | מחלק ג (בלי `/` בסוף) |
| `INITIAL_ADMIN_EMAIL` | האימייל שלך כמנהלת, לדוגמה `manager@example.com` |
| `INITIAL_ADMIN_PASSWORD` | סיסמה חזקה שתבחרי: 8 תווים לפחות, אות באנגלית וספרה |
| `SEED_DEMO_ROOMS` | `true` (מוסיף 8 חדרי הדגמה. אפשר `false` אם רוצים להתחיל ריק) |

> 💡 `INITIAL_ADMIN_*` – בהפעלה הראשונה נוצר מנהל עם הפרטים האלה. אם המשתמש כבר קיים, לא קורה כלום. אחרי שהתחברת פעם אחת, אפשר למחוק את `INITIAL_ADMIN_PASSWORD` מ־Render.
> 💡 עדיין לא הקמת R2? אפשר לשים זמנית `STORAGE_PROVIDER` = `local` ולדלג על משתני R2. השרת יעבוד, אבל תמונות שיועלו יימחקו בכל הפעלה מחדש.

### 4. Health Check
אם יש שדה **Health Check Path** (בדרך כלל תחת **Advanced**): `/api/health`

### 5. Deploy
1. **Create Web Service**.
2. Render מתחיל לבנות. אפשר לצפות ב־**Logs**. זה לוקח כמה דקות.
3. בסיום יופיע **Live** ✅, ובלוג שורה כמו:
   ```
   🏨 VELLORA HOTEL API פועל על פורט 10000
   ```
4. למעלה מופיעה כתובת השרת, למשל `https://vellora-hotel-api.onrender.com`. **זו כתובת ה־Base URL** שלך.

> 🔁 מעכשיו, כל שינוי שתעלי ל־GitHub יגרום ל־Render לבנות ולהפעיל מחדש אוטומטית.

<details>
<summary>דרך חלופית: Blueprint (הגדרה מתוך render.yaml)</summary>

במקום שלב 2: **New** ← **Blueprint** ← בחירת ה־Repository. Render יקרא את `render.yaml`, ייצור את השירות וישאל רק על הערכים הסודיים (`DATABASE_URL`, `CORS_ORIGINS`, משתני R2, `INITIAL_ADMIN_*`). `JWT_SECRET` נוצר אוטומטית.
</details>

### 6. בדיקה שהשרת פעיל
פתחי בדפדפן: `https://<הכתובת-שלך>.onrender.com/api/health`

צריך לראות:
```json
{ "status": "ok", "database": "up", "storage": "r2", ... }
```

> ⏳ שרת חינמי "נרדם" אחרי 15 דקות בלי שימוש. הכניסה הראשונה אחרי זה לוקחת כדקה. זה תקין. לפני הצגת הפרויקט – פתחי את `/api/health` דקה מראש.

---

## חלק ה – בדיקה מלאה דרך Swagger

כתובת: `https://<הכתובת-שלך>.onrender.com/api-docs`

### 1. בדיקת בריאות
פתחי **System** ← `GET /api/health` ← **Try it out** ← **Execute** ← תשובה `200`.

### 2. התחברות כמנהלת
1. **Auth** ← `POST /api/auth/login` ← **Try it out**.
2. בתיבה שימי את הפרטים מ־`INITIAL_ADMIN_EMAIL` ו־`INITIAL_ADMIN_PASSWORD`:
   ```json
   { "email": "manager@example.com", "password": "הסיסמה-שלך" }
   ```
3. **Execute** ← תשובה `200` עם `token`.

### 3. קבלת JWT ושימוש ב־Authorize
1. העתיקי את הערך של `token` (בלי המירכאות).
2. למעלה בדף: הכפתור **Authorize** 🔓.
3. הדביקי את ה־Token בשדה **Value** (בלי המילה Bearer) ← **Authorize** ← **Close**.
4. המנעול נסגר 🔒 – מעכשיו כל קריאה נשלחת עם ה־Token.

### 4. קריאה למסלול מוגן
**Auth** ← `GET /api/auth/me` ← **Try it out** ← **Execute** ← רואים את הפרטים שלך עם `"role": "ADMIN"`.

### 5. הוספת רשומה – חדר חדש עם תמונה
1. **Rooms** ← `POST /api/rooms` ← **Try it out**.
2. מלאי: `roomNumber` = `401`, `name` = `חדר בדיקה`, `type` = `DOUBLE`, `pricePerNight` = `550`, `maxGuests` = `2`, `floor` = `4`.
3. ב־`image` לחצי **Choose File** ובחרי תמונה (JPG/PNG/WEBP, עד 5MB).
4. **Execute** ← תשובה `201`. העתיקי את `id` מהתשובה.
5. העתיקי את `imageUrl` ופתחי בלשונית חדשה – התמונה מוצגת מ־Cloudflare R2 ✅.

### 6. שליפת הרשומה ממסד הנתונים
**Rooms** ← `GET /api/rooms/{id}` ← הדביקי את ה־`id` ← **Execute** ← החדר חוזר. הנתונים שמורים ב־Supabase.
(אפשר לראות אותם גם ב־Supabase ← **Table Editor** ← הטבלה `Room`.)

### 7. בדיקת הרשאות
- **401:** לחצי **Authorize** ← **Logout**, ונסי `GET /api/auth/me` ← תשובה `401`.
- **403:** הירשמי כלקוח ב־`POST /api/auth/register`, הכניסי את ה־Token שלו ל־Authorize, ונסי `POST /api/rooms` ← תשובה `403`.

### 8. תהליך הזמנה מלא
1. כלקוח: `GET /api/rooms` עם `checkIn` ו־`checkOut` עתידיים ← בחרי `id` של חדר.
2. `POST /api/bookings` עם `roomId`, `checkIn`, `checkOut`, `phone` ← `201`, סטטוס `PENDING`.
3. כמנהלת: `GET /api/bookings` ← רואים את הבקשה ← `PATCH /api/bookings/{id}/status` עם `{ "status": "APPROVED" }`.
4. כלקוח: `GET /api/bookings/my` ← הסטטוס `APPROVED`.

---

## חלק ו – פתרון תקלות

| תקלה | איך מזהים | פתרון |
|---|---|---|
| **Build failed** | ב־Logs של Render שגיאה בזמן הבנייה | ודאי ש־Build Command הוא בדיוק `npm ci --include=dev && npm run build`. ודאי ש־`package.json` ו־`package-lock.json` בשורש ה־Repository (לא בתוך תיקייה). |
| **`DATABASE_URL` שגוי** | בלוג: `P1001`, `Can't reach database server`, `password authentication failed`, או `"database": "down"` | העתיקי מחדש את מחרוזת ה־**Session pooler** (פורט 5432). ודאי שהחלפת `[YOUR-PASSWORD]` בסיסמה ושאין רווחים. סיסמה עם תווים מיוחדים – אפסי לסיסמה עם אותיות וספרות. בדקי שהפרויקט ב־Supabase לא בהשהיה. |
| **בעיית Prisma / Migrations** | בלוג: `prisma migrate deploy` נכשל, `P3009`, `P3018` | ודאי ש־`DATABASE_URL` נכון. ודאי שהתיקייה `prisma/migrations` עלתה ל־GitHub. ב־P3009 (Migration שנכשלה באמצע) – ב־Supabase ← **SQL Editor** הריצי `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` (⚠️ מוחק את כל הנתונים) ואז ב־Render: **Manual Deploy** ← **Deploy latest commit**. |
| **`JWT_SECRET` חסר** | בלוג: `❌ הגדרות סביבה שגויות: JWT_SECRET...` | הוסיפי ב־Render ← **Environment** את `JWT_SECRET` עם 32 תווים לפחות ← **Save Changes**. |
| **משתני R2 חסרים** | בלוג: `R2_... חסר (נדרש כש־STORAGE_PROVIDER=r2)` | הוסיפי את חמשת משתני R2, או שני זמנית ל־`STORAGE_PROVIDER=local`. |
| **העלאת תמונה נכשלת (500)** | `POST /api/rooms` עם תמונה מחזיר 500 | בדקי ש־`R2_ACCOUNT_ID`, המפתחות ושם ה־Bucket נכונים, ושה־Token הוא **Object Read & Write** על ה־Bucket הנכון. |
| **התמונה לא נפתחת** | `imageUrl` מחזיר שגיאה | ודאי שהפעלת **Public Development URL** ב־Bucket, ושה־`R2_PUBLIC_URL` הוא בדיוק הכתובת שהוצגה (בלי `/` בסוף). |
| **שגיאת CORS** | בקונסול של הדפדפן ב־React: `blocked by CORS policy` | הוסיפי את כתובת ה־React ל־`CORS_ORIGINS`, בדיוק כמו בשורת הכתובת, בלי `/` בסוף. כמה כתובות – מופרדות בפסיק: `http://localhost:5173,https://my-site.vercel.app` |
| **401** | `"code": "UNAUTHORIZED"` | לא נשלח Token, או שפג תוקפו (יום אחד). התחברי מחדש. ב־Swagger – Authorize מחדש. ב־React – הכותרת חייבת להיות `Authorization: Bearer <token>`. |
| **403** | `"code": "FORBIDDEN"` | המשתמש מחובר אבל אין לו הרשאה: לקוח שמנסה פעולת מנהל, או מנהל שמנסה לשלוח בקשת הזמנה. התחברי עם המשתמש המתאים. |
| **Swagger לא נפתח** | `/api-docs` לא נטען | ודאי שהכתובת היא `/api-docs` (עם מקף). חכי דקה – אולי השרת מתעורר. בדקי קודם ש־`/api/health` עובד. |
| **השרת לא עולה** | הסטטוס ב־Render הוא **Failed**, או Health check נכשל | פתחי **Logs** וחפשי את השורה עם ❌ – היא אומרת מה חסר. ודאי ש־Start Command הוא `npm run start:prod`. |
| **הבקשה הראשונה איטית מאוד** | לוקח כדקה | השרת החינמי התעורר משינה. זה תקין. |
| **לא מצליחה להתחבר כמנהלת** | `401` ב־login | ודאי ש־`INITIAL_ADMIN_EMAIL` ו־`INITIAL_ADMIN_PASSWORD` הוגדרו **לפני** ההפעלה, ושהסיסמה עומדת בכללים (8+ תווים, אות וספרה). אם לא – בלוג תופיע אזהרה ⚠️. תקני ← **Save Changes** ← Render יפעיל מחדש. |

---

## נספח: Cloudinary במקום Cloudflare R2 (בלי כרטיס אשראי)

1. https://cloudinary.com ← **Sign up for free**.
2. בלוח הבקרה (**Dashboard** / **API Keys**) העתיקי: **Cloud name**, **API Key**, **API Secret**.
3. ב־Render ← **Environment**:

| Key | Value |
|---|---|
| `STORAGE_PROVIDER` | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME` | ה־Cloud name |
| `CLOUDINARY_API_KEY` | ה־API Key |
| `CLOUDINARY_API_SECRET` | ה־API Secret |

4. אפשר למחוק את משתני `R2_*`. **Save Changes**.

אין צורך לשנות קוד – השרת בוחר את השירות לפי `STORAGE_PROVIDER`.

---

## נספח: הרצה על המחשב (לא חובה)

אם תרצי להריץ את השרת גם אצלך (נוח בזמן פיתוח ה־React):

1. התקיני [Node.js 22 LTS](https://nodejs.org).
2. פתחי Terminal בתיקיית הפרויקט.
3. ```bash
   npm install
   ```
4. העתיקי את `.env.example` לקובץ חדש בשם `.env`, וב־`DATABASE_URL` שימי את מחרוזת Supabase (או PostgreSQL מקומי). ב־`JWT_SECRET` – מחרוזת ארוכה כלשהי.
5. ```bash
   npm run db:deploy
   npm run db:seed
   npm run dev
   ```
6. השרת על http://localhost:4000 ו־Swagger על http://localhost:4000/api-docs.

> ⚠️ אם תריצי `npm run db:seed` מול מסד Supabase של הפרודקשן, יתווספו משתמשי הדגמה עם סיסמאות ידועות. עדיף מסד נפרד לפיתוח (אפשר פרויקט Supabase שני).
