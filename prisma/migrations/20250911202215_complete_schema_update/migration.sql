-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."ActivityType" ADD VALUE 'USER_CREATED';
ALTER TYPE "public"."ActivityType" ADD VALUE 'USER_DELETED';
ALTER TYPE "public"."ActivityType" ADD VALUE 'SYSTEM_MAINTENANCE';

-- AlterEnum
ALTER TYPE "public"."QuoteStatus" ADD VALUE 'CANCELLED';
