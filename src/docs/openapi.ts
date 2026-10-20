// תיעוד OpenAPI 3 של כל ה־API. מוצג ב־/api-docs ונשמר גם ב־docs/openapi.json (npm run openapi:export)

const err = (code: string, message: string, details?: { field: string; message: string }[]) => ({
  value: { error: { code, message, ...(details ? { details } : {}) } },
});

const errorResponse = (description: string, examples: Record<string, ReturnType<typeof err>>) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, examples } },
});

const R = {
  400: (examples: Record<string, ReturnType<typeof err>> = {}) =>
    errorResponse('נתונים לא תקינים', {
      validation: err('BAD_REQUEST', 'הנתונים שנשלחו אינם תקינים', [{ field: 'email', message: 'כתובת אימייל לא תקינה' }]),
      ...examples,
    }),
  401: errorResponse('לא מחובר, או Token לא תקין / פג תוקף', {
    missing: err('UNAUTHORIZED', 'נדרשת התחברות. יש לשלוח Authorization: Bearer <token>'),
    invalid: err('UNAUTHORIZED', 'ה־Token לא תקין או שפג תוקפו. יש להתחבר מחדש'),
  }),
  403: errorResponse('מחובר, אבל אין הרשאה לפעולה', { forbidden: err('FORBIDDEN', 'אין לך הרשאה לבצע פעולה זו') }),
  404: (message: string) => errorResponse('לא נמצא', { notFound: err('NOT_FOUND', message) }),
  409: (examples: Record<string, ReturnType<typeof err>>) => errorResponse('התנגשות עם מצב קיים', examples),
};

const roomExample = {
  id: '6f1c2a9e-3b7d-4f0a-9c51-2d8e4b6a7f10',
  roomNumber: 301,
  name: 'סוויטת הנוף',
  type: 'SUITE',
  pricePerNight: 1350,
  maxGuests: 4,
  floor: 3,
  description: 'סוויטה עם סלון נפרד ונוף פתוח לעיר.',
  imageUrl: 'https://pub-xxxxxxxx.r2.dev/rooms/0b6c1f0e-8a1d-4d5e-a6f4-1e2f3a4b5c6d.jpg',
  status: 'AVAILABLE',
  createdAt: '2026-10-19T08:00:00.000Z',
  updatedAt: '2026-10-19T08:00:00.000Z',
};

const userExample = { id: '0d6a1c8e-5f3b-4a2d-9e71-8c4b2a6f1d30', fullName: 'יוסי כהן', email: 'yossi@vellora.test', role: 'CUSTOMER', createdAt: '2026-10-19T08:00:00.000Z' };
const tokenExample = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiQ1VTVE9NRVIiLCJzdWIiOiIuLi4ifQ.signature';

const bookingExample = {
  id: 'a3e9b1c4-7d2f-4e8a-b5c6-1f0d9e8c7b6a',
  status: 'PENDING',
  checkIn: '2026-11-10',
  checkOut: '2026-11-13',
  nights: 3,
  pricePerNight: 1350,
  totalPrice: 4050,
  guestName: 'אברהם כהן',
  phone: '050-1234567',
  notes: 'נשמח לחדר בקומה גבוהה',
  room: { id: roomExample.id, roomNumber: 301, name: 'סוויטת הנוף', type: 'SUITE', maxGuests: 4, floor: 3, imageUrl: roomExample.imageUrl, deleted: false },
  customer: { id: userExample.id, fullName: 'יוסי כהן', email: 'yossi@vellora.test' },
  decidedBy: null,
  decidedAt: null,
  createdAt: '2026-10-19T08:30:00.000Z',
  updatedAt: '2026-10-19T08:30:00.000Z',
};

const pageParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'מספר עמוד' },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 }, description: 'פריטים בעמוד (עד 50)' },
];
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const bearer = [{ bearerAuth: [] }];

const roomFormProps = {
  roomNumber: { type: 'integer', minimum: 1, maximum: 9999, example: 301, description: 'ייחודי' },
  name: { type: 'string', minLength: 2, maxLength: 100, example: 'סוויטת הנוף' },
  type: { $ref: '#/components/schemas/RoomType' },
  pricePerNight: { type: 'number', minimum: 0.01, maximum: 100000, example: 1350, description: 'גדול מ־0, עד 2 ספרות אחרי הנקודה' },
  maxGuests: { type: 'integer', minimum: 1, maximum: 10, example: 4 },
  floor: { type: 'integer', minimum: 0, maximum: 100, example: 3 },
  description: { type: 'string', maxLength: 1000, example: 'סוויטה עם סלון נפרד ונוף פתוח לעיר.' },
  status: { $ref: '#/components/schemas/RoomStatus' },
  image: { type: 'string', format: 'binary', description: 'תמונה אחת: JPG / PNG / WEBP, עד 5MB (רשות)' },
};

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'VELLORA HOTEL API',
    version: '1.0.0',
    description: [
      'צד השרת של מערכת בקשות ההזמנה של VELLORA HOTEL.',
      '',
      '**איך בודקים מסלול מוגן:**',
      '1. פתחי את `POST /api/auth/login` ← **Try it out** ← שלחי אימייל וסיסמה ← **Execute**.',
      '2. העתיקי את הערך של `token` מהתשובה.',
      '3. לחצי על הכפתור **Authorize** למעלה, הדביקי את ה־Token (בלי המילה Bearer) ← **Authorize** ← **Close**.',
      '4. מעכשיו כל קריאה תישלח עם ה־Token.',
      '',
      'כל שגיאה מוחזרת במבנה: `{ "error": { "code", "message", "details"? } }`.',
      'תאריכים בפורמט `YYYY-MM-DD`. מחירים בשקלים.',
    ].join('\n'),
  },
  servers: [{ url: '/', description: 'השרת הנוכחי' }],
  tags: [
    { name: 'System', description: 'בדיקת בריאות' },
    { name: 'Auth', description: 'הרשמה והתחברות' },
    { name: 'Rooms', description: 'חדרים – צפייה ציבורית, ניהול למנהל' },
    { name: 'Bookings', description: 'בקשות הזמנה' },
    { name: 'Admins', description: 'ניהול מנהלים' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'ה־Token שמתקבל מ־login או register' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', example: 'BAD_REQUEST' },
              message: { type: 'string', example: 'הנתונים שנשלחו אינם תקינים' },
              details: {
                type: 'array',
                items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } },
              },
            },
          },
        },
      },
      Role: { type: 'string', enum: ['CUSTOMER', 'ADMIN'] },
      RoomType: { type: 'string', enum: ['SINGLE', 'DOUBLE', 'FAMILY', 'SUITE'], description: 'יחיד / זוגי / משפחתי / סוויטה' },
      RoomStatus: { type: 'string', enum: ['AVAILABLE', 'UNAVAILABLE'], description: 'זמין / לא זמין (למשל בשיפוצים)' },
      BookingStatus: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'], description: 'ממתינה / מאושרת / נדחתה' },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { $ref: '#/components/schemas/Role' },
          createdAt: { type: 'string', format: 'date-time' },
        },
        example: userExample,
      },
      AuthResponse: {
        type: 'object',
        properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } },
        example: { token: tokenExample, user: userExample },
      },
      NewUserRequest: {
        type: 'object',
        required: ['fullName', 'email', 'password', 'confirmPassword'],
        properties: {
          fullName: { type: 'string', minLength: 2, maxLength: 100, example: 'יוסי כהן' },
          email: { type: 'string', format: 'email', example: 'yossi@example.com' },
          password: { type: 'string', minLength: 8, maxLength: 72, description: 'לפחות 8 תווים, אות באנגלית וספרה', example: 'Hotel2026' },
          confirmPassword: { type: 'string', description: 'חייב להיות זהה ל־password', example: 'Hotel2026' },
        },
      },
      Room: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          roomNumber: { type: 'integer' },
          name: { type: 'string' },
          type: { $ref: '#/components/schemas/RoomType' },
          pricePerNight: { type: 'number' },
          maxGuests: { type: 'integer' },
          floor: { type: 'integer' },
          description: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true, description: 'כתובת מלאה להצגת התמונה, או null אם אין' },
          status: { $ref: '#/components/schemas/RoomStatus' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        example: roomExample,
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          status: { $ref: '#/components/schemas/BookingStatus' },
          checkIn: { type: 'string', format: 'date' },
          checkOut: { type: 'string', format: 'date' },
          nights: { type: 'integer' },
          pricePerNight: { type: 'number', description: 'המחיר ללילה ברגע שליחת הבקשה' },
          totalPrice: { type: 'number', description: 'nights × pricePerNight – מחושב בשרת' },
          guestName: { type: 'string' },
          phone: { type: 'string' },
          notes: { type: 'string', nullable: true },
          room: {
            type: 'object',
            description: 'פרטי החדר. אם החדר נמחק: deleted=true, ונשארים מספר ושם החדר מתוך ההזמנה',
            properties: {
              id: { type: 'string', format: 'uuid', nullable: true },
              roomNumber: { type: 'integer' },
              name: { type: 'string' },
              type: { allOf: [{ $ref: '#/components/schemas/RoomType' }], nullable: true },
              maxGuests: { type: 'integer', nullable: true },
              floor: { type: 'integer', nullable: true },
              imageUrl: { type: 'string', nullable: true },
              deleted: { type: 'boolean' },
            },
          },
          customer: { type: 'object', properties: { id: { type: 'string' }, fullName: { type: 'string' }, email: { type: 'string' } } },
          decidedBy: { type: 'object', nullable: true, properties: { id: { type: 'string' }, fullName: { type: 'string' } } },
          decidedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        example: bookingExample,
      },
      RoomPage: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/Room' } },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 7 },
          totalPages: { type: 'integer', example: 1 },
        },
      },
      BookingPage: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/Booking' } },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 1 },
          totalPages: { type: 'integer', example: 1 },
        },
      },
      RoomForm: { type: 'object', required: ['roomNumber', 'name', 'type', 'pricePerNight', 'maxGuests', 'floor'], properties: roomFormProps },
      RoomUpdateForm: {
        type: 'object',
        description: 'כל השדות רשות. שולחים רק את מה שמשתנה. description ריק מוחק את התיאור',
        properties: roomFormProps,
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'בדיקת בריאות השרת ומסד הנתונים',
        responses: {
          200: {
            description: 'השרת ומסד הנתונים תקינים',
            content: { 'application/json': { example: { status: 'ok', database: 'up', storage: 'r2', uptimeSeconds: 42, timestamp: '2026-10-19T08:00:00.000Z' } } },
          },
          503: { description: 'מסד הנתונים לא זמין', content: { 'application/json': { example: { status: 'error', database: 'down' } } } },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'הרשמת לקוח חדש',
        description: 'יוצר משתמש בתפקיד CUSTOMER ומחזיר Token – הלקוח מחובר מיד. אי אפשר להירשם כמנהל.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/NewUserRequest' } } } },
        responses: {
          201: { description: 'נרשם בהצלחה', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: R[400]({ mismatch: err('BAD_REQUEST', 'הנתונים שנשלחו אינם תקינים', [{ field: 'confirmPassword', message: 'הסיסמאות אינן תואמות' }]) }),
          409: R[409]({ emailTaken: err('EMAIL_TAKEN', 'כתובת האימייל כבר רשומה במערכת') }),
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'התחברות',
        description: 'מחזיר JWT. את ה־token מכניסים בכפתור Authorize.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } },
              examples: {
                admin: { summary: 'מנהל (נתוני הדגמה)', value: { email: 'admin@vellora.test', password: 'Admin1234' } },
                customer: { summary: 'לקוח (נתוני הדגמה)', value: { email: 'yossi@vellora.test', password: 'Customer1234' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'התחברות הצליחה', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: R[400](),
          401: errorResponse('אימייל או סיסמה שגויים', { wrong: err('UNAUTHORIZED', 'אימייל או סיסמה שגויים') }),
          429: errorResponse('יותר מדי ניסיונות', { tooMany: err('TOO_MANY_REQUESTS', 'יותר מדי ניסיונות. נסי שוב בעוד כמה דקות') }),
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'פרטי המשתמש המחובר',
        description: 'מחייב Token. שימושי בטעינת האפליקציה כדי לדעת מי מחובר ומה התפקיד שלו.',
        security: bearer,
        responses: {
          200: { description: 'המשתמש המחובר', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
          401: R[401],
        },
      },
    },
    '/api/rooms': {
      get: {
        tags: ['Rooms'],
        summary: 'רשימת חדרים עם סינון, חיפוש ומיון',
        description:
          'ציבורי. מבקר ולקוח רואים רק חדרים זמינים (AVAILABLE). מנהל מחובר רואה את כל החדרים ויכול לסנן לפי status. ' +
          'כשנשלחים checkIn ו־checkOut – מוחזרים רק חדרים פנויים בתאריכים האלה.',
        security: [{}, { bearerAuth: [] }],
        parameters: [
          { name: 'checkIn', in: 'query', schema: { type: 'string', format: 'date' }, description: 'תאריך כניסה (יחד עם checkOut)', example: '2026-11-10' },
          { name: 'checkOut', in: 'query', schema: { type: 'string', format: 'date' }, description: 'תאריך יציאה (יחד עם checkIn)', example: '2026-11-13' },
          { name: 'type', in: 'query', schema: { $ref: '#/components/schemas/RoomType' } },
          { name: 'minPrice', in: 'query', schema: { type: 'number', minimum: 0 } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number', minimum: 0 } },
          { name: 'guests', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10 }, description: 'חדרים שמתאימים לפחות למספר האורחים הזה' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'חיפוש בשם החדר' },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/RoomStatus' }, description: 'למנהל בלבד. אצל אחרים – מתעלמים' },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['roomNumber_asc', 'price_asc', 'price_desc', 'name_asc'], default: 'roomNumber_asc' } },
          ...pageParams,
        ],
        responses: {
          200: { description: 'רשימת חדרים', content: { 'application/json': { schema: { $ref: '#/components/schemas/RoomPage' } } } },
          400: R[400]({ dates: err('BAD_REQUEST', 'הנתונים שנשלחו אינם תקינים', [{ field: 'checkOut', message: 'תאריך היציאה חייב להיות אחרי תאריך הכניסה' }]) }),
        },
      },
      post: {
        tags: ['Rooms'],
        summary: 'הוספת חדר (מנהל)',
        description: 'נשלח כ־multipart/form-data כדי שאפשר יהיה לצרף תמונה. השרת מעלה את התמונה לאחסון (Cloudflare R2) בעצמו.',
        security: bearer,
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { $ref: '#/components/schemas/RoomForm' } } } },
        responses: {
          201: { description: 'החדר נוצר', content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } } },
          400: R[400]({ image: err('BAD_REQUEST', 'קובץ התמונה אינו נתמך', [{ field: 'image', message: 'יש להעלות תמונה מסוג JPG, PNG או WEBP' }]) }),
          401: R[401],
          403: R[403],
          409: R[409]({ roomNumberTaken: err('ROOM_NUMBER_TAKEN', 'מספר החדר כבר קיים במערכת') }),
          413: errorResponse('תמונה גדולה מדי', { tooLarge: err('FILE_TOO_LARGE', 'התמונה גדולה מדי. הגודל המקסימלי הוא 5MB') }),
        },
      },
    },
    '/api/rooms/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Rooms'],
        summary: 'פרטי חדר',
        description: 'ציבורי. חדר לא זמין מחזיר 404 למי שאינו מנהל.',
        security: [{}, { bearerAuth: [] }],
        responses: {
          200: { description: 'החדר', content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } } },
          400: R[400](),
          404: R[404]('החדר לא נמצא'),
        },
      },
      patch: {
        tags: ['Rooms'],
        summary: 'עדכון חדר / החלפת תמונה (מנהל)',
        description: 'שולחים רק את השדות שמשתנים. תמונה חדשה מחליפה את הישנה (והישנה נמחקת מהאחסון).',
        security: bearer,
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { $ref: '#/components/schemas/RoomUpdateForm' } } } },
        responses: {
          200: { description: 'החדר אחרי העדכון', content: { 'application/json': { schema: { $ref: '#/components/schemas/Room' } } } },
          400: R[400]({ empty: err('BAD_REQUEST', 'לא נשלחו שדות לעדכון', [{ field: 'body', message: 'יש לשלוח לפחות שדה אחד או תמונה חדשה' }]) }),
          401: R[401],
          403: R[403],
          404: R[404]('החדר לא נמצא'),
          409: R[409]({ roomNumberTaken: err('ROOM_NUMBER_TAKEN', 'מספר החדר כבר קיים במערכת') }),
          413: errorResponse('תמונה גדולה מדי', { tooLarge: err('FILE_TOO_LARGE', 'התמונה גדולה מדי. הגודל המקסימלי הוא 5MB') }),
        },
      },
      delete: {
        tags: ['Rooms'],
        summary: 'מחיקת חדר (מנהל)',
        description: 'אסור כשיש לחדר הזמנה ממתינה או מאושרת שעוד לא הסתיימה. הזמנות ישנות נשארות בהיסטוריה.',
        security: bearer,
        responses: {
          204: { description: 'החדר נמחק' },
          401: R[401],
          403: R[403],
          404: R[404]('החדר לא נמצא'),
          409: R[409]({
            activeBookings: err('ROOM_HAS_ACTIVE_BOOKINGS', 'לא ניתן למחוק את החדר: יש לו הזמנה פעילה (2026-11-10 עד 2026-11-13). אפשר לסמן אותו כ"לא זמין" במקום.'),
          }),
        },
      },
    },
    '/api/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'שליחת בקשת הזמנה (לקוח)',
        description:
          'הלקוח נקבע לפי ה־Token. הבקשה נוצרת בסטטוס PENDING ותופסת את התאריכים עד החלטת המנהל. ' +
          'המחיר הכולל מחושב בשרת. אם guestName לא נשלח – נשמר שם הלקוח.',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['roomId', 'checkIn', 'checkOut', 'phone'],
                properties: {
                  roomId: { type: 'string', format: 'uuid' },
                  checkIn: { type: 'string', format: 'date', description: 'לא בעבר, עד שנה קדימה' },
                  checkOut: { type: 'string', format: 'date', description: 'אחרי checkIn, עד 30 לילות' },
                  phone: { type: 'string', example: '050-1234567' },
                  guestName: { type: 'string', minLength: 2, maxLength: 100, description: 'רשות – הזמנה על שם אדם אחר' },
                  notes: { type: 'string', maxLength: 500, description: 'רשות' },
                },
              },
              example: { roomId: roomExample.id, checkIn: '2026-11-10', checkOut: '2026-11-13', phone: '050-1234567', guestName: 'אברהם כהן', notes: 'נשמח לחדר בקומה גבוהה' },
            },
          },
        },
        responses: {
          201: { description: 'הבקשה נשלחה', content: { 'application/json': { schema: { $ref: '#/components/schemas/Booking' } } } },
          400: R[400]({ past: err('BAD_REQUEST', 'הנתונים שנשלחו אינם תקינים', [{ field: 'checkIn', message: 'תאריך הכניסה לא יכול להיות בעבר' }]) }),
          401: R[401],
          403: R[403],
          404: R[404]('החדר לא נמצא או שאינו זמין להזמנה'),
          409: R[409]({ taken: err('ROOM_NOT_AVAILABLE_FOR_DATES', 'החדר כבר תפוס בחלק מהתאריכים שנבחרו. נסי תאריכים אחרים') }),
        },
      },
      get: {
        tags: ['Bookings'],
        summary: 'כל ההזמנות (מנהל)',
        description: 'ברירת המחדל: ממתינות קודם, ובתוך כל סטטוס – החדשות קודם. from/to מחזירים הזמנות שהשהות שלהן חופפת לטווח.',
        security: bearer,
        parameters: [
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/BookingStatus' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'roomId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'חיפוש לפי שם לקוח, אימייל או שם אורח' },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['status', 'createdAt_desc', 'createdAt_asc', 'checkIn_asc', 'checkIn_desc'], default: 'status' } },
          ...pageParams,
        ],
        responses: {
          200: { description: 'רשימת הזמנות', content: { 'application/json': { schema: { $ref: '#/components/schemas/BookingPage' } } } },
          400: R[400](),
          401: R[401],
          403: R[403],
        },
      },
    },
    '/api/bookings/my': {
      get: {
        tags: ['Bookings'],
        summary: 'ההזמנות שלי (לקוח)',
        description: 'רק ההזמנות של המשתמש המחובר, כולל פרטי החדר ותמונה.',
        security: bearer,
        parameters: [
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/BookingStatus' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['createdAt_desc', 'createdAt_asc', 'checkIn_asc', 'checkIn_desc'], default: 'createdAt_desc' } },
          ...pageParams,
        ],
        responses: {
          200: { description: 'רשימת ההזמנות שלי', content: { 'application/json': { schema: { $ref: '#/components/schemas/BookingPage' } } } },
          400: R[400](),
          401: R[401],
          403: R[403],
        },
      },
    },
    '/api/bookings/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Bookings'],
        summary: 'פרטי הזמנה',
        description: 'לקוח – רק הזמנה שלו (הזמנה של אחר מחזירה 404). מנהל – כל הזמנה.',
        security: bearer,
        responses: {
          200: { description: 'ההזמנה', content: { 'application/json': { schema: { $ref: '#/components/schemas/Booking' } } } },
          400: R[400](),
          401: R[401],
          404: R[404]('ההזמנה לא נמצאה'),
        },
      },
    },
    '/api/bookings/{id}/status': {
      parameters: [idParam],
      patch: {
        tags: ['Bookings'],
        summary: 'אישור או דחיית בקשה (מנהל)',
        description: 'רק לבקשה בסטטוס PENDING. ההחלטה סופית. דחייה משחררת את התאריכים.',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['APPROVED', 'REJECTED'] } } },
              examples: { approve: { summary: 'אישור', value: { status: 'APPROVED' } }, reject: { summary: 'דחייה', value: { status: 'REJECTED' } } },
            },
          },
        },
        responses: {
          200: { description: 'ההזמנה אחרי ההחלטה', content: { 'application/json': { schema: { $ref: '#/components/schemas/Booking' } } } },
          400: R[400](),
          401: R[401],
          403: R[403],
          404: R[404]('ההזמנה לא נמצאה'),
          409: R[409]({ decided: err('BOOKING_ALREADY_DECIDED', 'ההזמנה כבר אושרה. אי אפשר לשנות החלטה') }),
        },
      },
    },
    '/api/admins': {
      get: {
        tags: ['Admins'],
        summary: 'רשימת מנהלים (מנהל)',
        security: bearer,
        responses: {
          200: { description: 'כל המנהלים', content: { 'application/json': { schema: { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } } } },
          401: R[401],
          403: R[403],
        },
      },
      post: {
        tags: ['Admins'],
        summary: 'הוספת מנהל (מנהל)',
        security: bearer,
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/NewUserRequest' } } } },
        responses: {
          201: { description: 'המנהל נוצר', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          400: R[400](),
          401: R[401],
          403: R[403],
          409: R[409]({ emailTaken: err('EMAIL_TAKEN', 'כתובת האימייל כבר רשומה במערכת') }),
        },
      },
    },
  },
};
