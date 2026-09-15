-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'RESERVED' BEFORE 'PENDING_PAYMENT';

-- AlterEnum
ALTER TYPE "FulfillmentStatus" ADD VALUE 'IN_PRODUCTION' BEFORE 'DONE';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isPreorder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preorderMinQty" INTEGER,
ADD COLUMN     "preorderReservedQty" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "isPreorder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentDueStartedAt" TIMESTAMP(3);
