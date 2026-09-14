-- CreateEnum
CREATE TYPE "AvailabilityMode" AS ENUM ('ALWAYS', 'LAST_ORDER_DATE', 'STOCK');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "availabilityMode" "AvailabilityMode" NOT NULL DEFAULT 'ALWAYS',
ADD COLUMN     "lastOrderAt" TIMESTAMP(3),
ADD COLUMN     "stock" INTEGER;
