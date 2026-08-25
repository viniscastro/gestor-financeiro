-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';

-- Set admin user
UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = 'vinislad17@gmail.com';
