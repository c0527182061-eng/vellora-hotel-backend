import type { RoomStatus, RoomType } from '../generated/prisma/client';

// נתוני הדגמה מומצאים בלבד
export type DemoRoom = {
  roomNumber: number;
  name: string;
  type: RoomType;
  pricePerNight: number;
  maxGuests: number;
  floor: number;
  description: string;
  status: RoomStatus;
};

export const demoRooms: DemoRoom[] = [
  { roomNumber: 101, name: 'חדר יחיד קלאסי', type: 'SINGLE', pricePerNight: 380, maxGuests: 1, floor: 1, description: 'חדר נעים לאורח יחיד, עם שולחן עבודה ומיטה רחבה.', status: 'AVAILABLE' },
  { roomNumber: 102, name: 'חדר זוגי סטנדרט', type: 'DOUBLE', pricePerNight: 520, maxGuests: 2, floor: 1, description: 'חדר מואר עם מיטה זוגית, פינת ישיבה ומקלחון.', status: 'AVAILABLE' },
  { roomNumber: 103, name: 'חדר זוגי עם מרפסת', type: 'DOUBLE', pricePerNight: 610, maxGuests: 2, floor: 1, description: 'חדר זוגי עם מרפסת פרטית הפונה לגינה.', status: 'AVAILABLE' },
  { roomNumber: 104, name: 'חדר יחיד שקט', type: 'SINGLE', pricePerNight: 350, maxGuests: 1, floor: 1, description: 'חדר יחיד בפינה שקטה. כרגע בשיפוצים.', status: 'UNAVAILABLE' },
  { roomNumber: 201, name: 'חדר משפחתי גן', type: 'FAMILY', pricePerNight: 790, maxGuests: 5, floor: 2, description: 'חדר משפחתי עם מיטה זוגית ושלוש מיטות יחיד.', status: 'AVAILABLE' },
  { roomNumber: 202, name: 'חדר משפחתי מרווח', type: 'FAMILY', pricePerNight: 850, maxGuests: 6, floor: 2, description: 'שני חללים מחוברים, מתאים למשפחות גדולות.', status: 'AVAILABLE' },
  { roomNumber: 301, name: 'סוויטת הנוף', type: 'SUITE', pricePerNight: 1350, maxGuests: 4, floor: 3, description: 'סוויטה עם סלון נפרד ונוף פתוח לעיר.', status: 'AVAILABLE' },
  { roomNumber: 302, name: 'סוויטת המלכות', type: 'SUITE', pricePerNight: 1900, maxGuests: 4, floor: 3, description: 'הסוויטה המפוארת במלון, עם מרפסת גדולה ופינת אוכל.', status: 'AVAILABLE' },
];
