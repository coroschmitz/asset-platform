-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "dispositionRec" TEXT,
ADD COLUMN     "estimatedResaleValue" DOUBLE PRECISION,
ADD COLUMN     "lastMovedDate" TIMESTAMP(3),
ADD COLUMN     "monthlyStorageCost" DOUBLE PRECISION DEFAULT 25.0;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "actualHours" DOUBLE PRECISION,
ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "checkedInLat" DOUBLE PRECISION,
ADD COLUMN     "checkedInLng" DOUBLE PRECISION,
ADD COLUMN     "checkedOutAt" TIMESTAMP(3),
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSource" TEXT,
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "invoicedAt" TIMESTAMP(3),
ADD COLUMN     "laborRate" DOUBLE PRECISION DEFAULT 85.0,
ADD COLUMN     "materialCost" DOUBLE PRECISION,
ADD COLUMN     "nteAmount" DOUBLE PRECISION,
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "slaCompletionDue" TIMESTAMP(3),
ADD COLUMN     "slaResponseDue" TIMESTAMP(3),
ADD COLUMN     "totalCost" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'inbound',
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "errorMsg" TEXT,
    "workOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FmPlatformConfig" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "tenantId" TEXT,
    "apiUrl" TEXT,
    "apiKey" TEXT,
    "webhookSecret" TEXT,
    "fieldMapping" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FmPlatformConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerScorecard" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "completedOnTime" INTEGER NOT NULL DEFAULT 0,
    "onTimeRate" DOUBLE PRECISION,
    "avgResponseHours" DOUBLE PRECISION,
    "avgCompletionHours" DOUBLE PRECISION,
    "communicationScore" DOUBLE PRECISION,
    "qualityScore" DOUBLE PRECISION,
    "overallScore" DOUBLE PRECISION,
    "cbreStarRating" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerScorecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disposition" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "method" TEXT NOT NULL,
    "weightLbs" DOUBLE PRECISION,
    "materialType" TEXT,
    "carbonAvoidedLbs" DOUBLE PRECISION,
    "recipientOrg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Disposition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookLog_source_idx" ON "WebhookLog"("source");

-- CreateIndex
CREATE INDEX "WebhookLog_createdAt_idx" ON "WebhookLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FmPlatformConfig_clientId_platform_key" ON "FmPlatformConfig"("clientId", "platform");

-- CreateIndex
CREATE INDEX "PartnerScorecard_partnerId_idx" ON "PartnerScorecard"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerScorecard_partnerId_period_key" ON "PartnerScorecard"("partnerId", "period");

-- AddForeignKey
ALTER TABLE "FmPlatformConfig" ADD CONSTRAINT "FmPlatformConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerScorecard" ADD CONSTRAINT "PartnerScorecard_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disposition" ADD CONSTRAINT "Disposition_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
