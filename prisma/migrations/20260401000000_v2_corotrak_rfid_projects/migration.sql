-- CreateEnum
CREATE TYPE "AssetClass" AS ENUM ('OFFICE_FURNITURE', 'LAB_SCIENTIFIC', 'TECHNOLOGY_IT', 'HEAVY_MACHINERY', 'FFE_HOSPITALITY', 'FFE_HEALTHCARE', 'FFE_EDUCATION');

-- CreateEnum
CREATE TYPE "RfidEventType" AS ENUM ('TAG_READ', 'ZONE_ENTER', 'ZONE_EXIT', 'PORTAL_SCAN', 'MANUAL_SCAN', 'BULK_SCAN');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'PROCUREMENT', 'RECEIVING', 'STAGING', 'IN_PROGRESS', 'PUNCH_LIST', 'COMPLETE', 'CLOSED');

-- AlterTable Asset
ALTER TABLE "Asset" ADD COLUMN "assetClass" "AssetClass" NOT NULL DEFAULT 'OFFICE_FURNITURE',
ADD COLUMN "rfidTagId" TEXT,
ADD COLUMN "rfidEpc" TEXT,
ADD COLUMN "lastRfidScanAt" TIMESTAMP(3),
ADD COLUMN "lastRfidZone" TEXT,
ADD COLUMN "lastRfidReaderId" TEXT,
ADD COLUMN "weightLbs" DOUBLE PRECISION,
ADD COLUMN "hazmatClass" TEXT,
ADD COLUMN "specialHandling" TEXT,
ADD COLUMN "warrantyExpiry" TIMESTAMP(3),
ADD COLUMN "leaseExpiry" TIMESTAMP(3),
ADD COLUMN "depreciationMethod" TEXT,
ADD COLUMN "usefulLifeMonths" INTEGER,
ADD COLUMN "carbonFootprintKg" DOUBLE PRECISION,
ADD COLUMN "circularityScore" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "Asset_rfidTagId_key" ON "Asset"("rfidTagId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_rfidEpc_key" ON "Asset"("rfidEpc");

-- CreateIndex
CREATE INDEX "Asset_rfidTagId_idx" ON "Asset"("rfidTagId");

-- CreateIndex
CREATE INDEX "Asset_assetClass_idx" ON "Asset"("assetClass");

-- AlterTable Location
ALTER TABLE "Location" ADD COLUMN "buildingCode" TEXT,
ADD COLUMN "rfidReaderCount" INTEGER DEFAULT 0,
ADD COLUMN "hasPortalReader" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable WorkOrder
ALTER TABLE "WorkOrder" ADD COLUMN "projectId" TEXT,
ADD COLUMN "assetClass" "AssetClass",
ADD COLUMN "moveWeight" DOUBLE PRECISION,
ADD COLUMN "crewSize" INTEGER,
ADD COLUMN "truckCount" INTEGER,
ADD COLUMN "milesDriven" DOUBLE PRECISION,
ADD COLUMN "carbonEmissionsKg" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "CoroTrakImport" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "workOrderNumber" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalPersonMoves" INTEGER NOT NULL,
    "totalWorkItems" INTEGER NOT NULL,
    "originBuildings" TEXT[],
    "destBuildings" TEXT[],
    "storageCount" INTEGER NOT NULL DEFAULT 0,
    "interBuildingCount" INTEGER NOT NULL DEFAULT 0,
    "intraBuildingCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IMPORTED',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoroTrakImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoroTrakMove" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "originLocation" TEXT NOT NULL,
    "originFloor" TEXT NOT NULL,
    "originRoom" TEXT NOT NULL,
    "destLocation" TEXT NOT NULL,
    "destFloor" TEXT NOT NULL,
    "destRoom" TEXT NOT NULL,
    "workItemCount" INTEGER NOT NULL DEFAULT 10,
    "isStorage" BOOLEAN NOT NULL DEFAULT false,
    "isInterBuilding" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scannedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rfidVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CoroTrakMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfidReader" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "readerType" TEXT NOT NULL,
    "zone" TEXT,
    "ipAddress" TEXT,
    "serialNumber" TEXT,
    "antennaCount" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastHeartbeat" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RfidReader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfidEvent" (
    "id" TEXT NOT NULL,
    "readerId" TEXT,
    "assetId" TEXT,
    "tagId" TEXT NOT NULL,
    "epc" TEXT,
    "eventType" "RfidEventType" NOT NULL,
    "zone" TEXT,
    "signalStrength" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "scannedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RfidEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfidTagAssignment" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "epc" TEXT NOT NULL,
    "tagType" TEXT NOT NULL DEFAULT 'UHF_PASSIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RfidTagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectNumber" TEXT NOT NULL,
    "description" TEXT,
    "projectType" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3),
    "targetDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "budget" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "locationId" TEXT,
    "generalContractor" TEXT,
    "projectManager" TEXT,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "receivedItems" INTEGER NOT NULL DEFAULT 0,
    "installedItems" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "dependsOn" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDelivery" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "poNumber" TEXT,
    "expectedDate" TIMESTAMP(3) NOT NULL,
    "receivedDate" TIMESTAMP(3),
    "itemCount" INTEGER NOT NULL,
    "receivedCount" INTEGER NOT NULL DEFAULT 0,
    "damagedCount" INTEGER NOT NULL DEFAULT 0,
    "stagingZone" TEXT,
    "inspectedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "ProjectDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SustainabilityReport" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "scope3TransportKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "embodiedCarbonKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbonAvoidedKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wasteToLandfillLbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wasteDivertedLbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cmur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "itemsReused" INTEGER NOT NULL DEFAULT 0,
    "itemsRecycled" INTEGER NOT NULL DEFAULT 0,
    "itemsDonated" INTEGER NOT NULL DEFAULT 0,
    "itemsDisposed" INTEGER NOT NULL DEFAULT 0,
    "totalMovesMiles" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SustainabilityReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoroTrakImport_clientId_idx" ON "CoroTrakImport"("clientId");

-- CreateIndex
CREATE INDEX "CoroTrakImport_workOrderNumber_idx" ON "CoroTrakImport"("workOrderNumber");

-- CreateIndex
CREATE INDEX "CoroTrakMove_importId_idx" ON "CoroTrakMove"("importId");

-- CreateIndex
CREATE INDEX "CoroTrakMove_employeeNumber_idx" ON "CoroTrakMove"("employeeNumber");

-- CreateIndex
CREATE INDEX "RfidReader_locationId_idx" ON "RfidReader"("locationId");

-- CreateIndex
CREATE INDEX "RfidEvent_tagId_idx" ON "RfidEvent"("tagId");

-- CreateIndex
CREATE INDEX "RfidEvent_assetId_idx" ON "RfidEvent"("assetId");

-- CreateIndex
CREATE INDEX "RfidEvent_createdAt_idx" ON "RfidEvent"("createdAt");

-- CreateIndex
CREATE INDEX "RfidEvent_zone_idx" ON "RfidEvent"("zone");

-- CreateIndex
CREATE UNIQUE INDEX "RfidTagAssignment_tagId_key" ON "RfidTagAssignment"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "RfidTagAssignment_epc_key" ON "RfidTagAssignment"("epc");

-- CreateIndex
CREATE INDEX "RfidTagAssignment_assetId_idx" ON "RfidTagAssignment"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectNumber_key" ON "Project"("projectNumber");

-- CreateIndex
CREATE INDEX "Project_clientId_idx" ON "Project"("clientId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDelivery_projectId_idx" ON "ProjectDelivery"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "SustainabilityReport_clientId_period_key" ON "SustainabilityReport"("clientId", "period");

-- CreateIndex
CREATE INDEX "SustainabilityReport_clientId_idx" ON "SustainabilityReport"("clientId");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoroTrakImport" ADD CONSTRAINT "CoroTrakImport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoroTrakMove" ADD CONSTRAINT "CoroTrakMove_importId_fkey" FOREIGN KEY ("importId") REFERENCES "CoroTrakImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfidReader" ADD CONSTRAINT "RfidReader_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfidEvent" ADD CONSTRAINT "RfidEvent_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "RfidReader"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfidEvent" ADD CONSTRAINT "RfidEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfidTagAssignment" ADD CONSTRAINT "RfidTagAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDelivery" ADD CONSTRAINT "ProjectDelivery_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SustainabilityReport" ADD CONSTRAINT "SustainabilityReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
