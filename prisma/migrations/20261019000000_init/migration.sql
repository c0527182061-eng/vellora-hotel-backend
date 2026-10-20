-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('SINGLE', 'DOUBLE', 'FAMILY', 'SUITE');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "fullName" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" UUID NOT NULL,
    "roomNumber" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "RoomType" NOT NULL,
    "pricePerNight" DECIMAL(10,2) NOT NULL,
    "maxGuests" INTEGER NOT NULL,
    "floor" INTEGER NOT NULL,
    "description" VARCHAR(1000),
    "imageKey" VARCHAR(500),
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roomId" UUID,
    "roomNumber" INTEGER NOT NULL,
    "roomName" VARCHAR(100) NOT NULL,
    "pricePerNight" DECIMAL(10,2) NOT NULL,
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "nights" INTEGER NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "guestName" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "notes" VARCHAR(500),
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Room_roomNumber_key" ON "Room"("roomNumber");

-- CreateIndex
CREATE INDEX "Room_status_idx" ON "Room"("status");

-- CreateIndex
CREATE INDEX "Room_type_idx" ON "Room"("type");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_roomId_status_idx" ON "Booking"("roomId", "status");

-- CreateIndex
CREATE INDEX "Booking_status_createdAt_idx" ON "Booking"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_checkIn_idx" ON "Booking"("checkIn");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Integrity checks (אילוצי תקינות ברמת מסד הנתונים)
ALTER TABLE "Room" ADD CONSTRAINT "Room_roomNumber_check" CHECK ("roomNumber" BETWEEN 1 AND 9999);
ALTER TABLE "Room" ADD CONSTRAINT "Room_pricePerNight_check" CHECK ("pricePerNight" > 0);
ALTER TABLE "Room" ADD CONSTRAINT "Room_maxGuests_check" CHECK ("maxGuests" BETWEEN 1 AND 10);
ALTER TABLE "Room" ADD CONSTRAINT "Room_floor_check" CHECK ("floor" BETWEEN 0 AND 100);
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_dates_check" CHECK ("checkOut" > "checkIn");
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_nights_check" CHECK ("nights" > 0);
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_totalPrice_check" CHECK ("totalPrice" > 0);
