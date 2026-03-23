-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('WORKER', 'RESPONSABLE_CONDITIONNEMENT', 'ADMIN_PRODUCTION', 'SUPER_ADMIN_IT', 'ADMIN', 'SUPER_ADMIN', 'CHEF_LIGNE', 'CHEFFE_TAPIS');

-- CreateEnum
CREATE TYPE "ModuleType" AS ENUM ('CHAMBRE', 'LIGNE', 'AUTOCLAVE', 'EMBALLAGE', 'ADMIN');

-- CreateEnum
CREATE TYPE "PaletteStatus" AS ENUM ('PARAGE_DONE', 'IN_CHAMBRE', 'CHAMBRE_ALERT', 'SENT_TO_LIGNE', 'IN_LIGNE', 'CONSUMED');

-- CreateEnum
CREATE TYPE "ChariotStatus" AS ENUM ('READY_FOR_AUTOCLAVE', 'IN_AUTOCLAVE', 'STERILIZED', 'IN_PACKAGING', 'DONE');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('RUNNING', 'COMPLETED', 'ANOMALY');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('READY_FOR_PACKAGING', 'IN_PACKAGING', 'PACKAGING_COMPLETE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PALETTE_READY_FOR_LIGNE', 'CHARIOT_READY_FOR_AUTOCLAVE', 'CYCLE_COMPLETE_FOR_PACKAGING', 'WORKFLOW_STEP_COMPLETED', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'WORKER',
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "assignedModule" "ModuleType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Palette" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "article" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "origin" TEXT NOT NULL,
    "status" "PaletteStatus" NOT NULL DEFAULT 'PARAGE_DONE',
    "notes" TEXT,
    "entryTime" TIMESTAMP(3),
    "exitTime" TIMESTAMP(3),
    "destinationLine" TEXT,
    "chambreWorkerId" TEXT,
    "ligneWorkerId" TEXT,
    "ligneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isWeightAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "weightAnomalyScore" DOUBLE PRECISION,
    "positionNumber" INTEGER,
    "positionZone" TEXT,
    "longeType" TEXT,

    CONSTRAINT "Palette_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaletteMovement" (
    "id" TEXT NOT NULL,
    "paletteId" TEXT NOT NULL,
    "fromStation" TEXT NOT NULL,
    "toStation" TEXT NOT NULL,
    "workerMatricule" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "PaletteMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chariot" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "article" TEXT NOT NULL,
    "boxCount" INTEGER NOT NULL,
    "estimatedWeight" DOUBLE PRECISION,
    "status" "ChariotStatus" NOT NULL DEFAULT 'READY_FOR_AUTOCLAVE',
    "ligneId" TEXT NOT NULL,
    "cheffeMatricule" TEXT NOT NULL,
    "paletteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBoxCountAnomaly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Chariot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoclaveCycle" (
    "id" TEXT NOT NULL,
    "autoclaveId" TEXT NOT NULL,
    "conducteurMatricule" TEXT NOT NULL,
    "assistantMatricule" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "actualDurationMin" INTEGER,
    "predictedDurationMin" INTEGER,
    "status" "CycleStatus" NOT NULL DEFAULT 'RUNNING',
    "totalBoxes" INTEGER NOT NULL DEFAULT 0,
    "totalWeightKg" DOUBLE PRECISION,
    "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "anomalyScore" DOUBLE PRECISION,
    "anomalyFlags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutoclaveCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoclaveCycleChariot" (
    "cycleId" TEXT NOT NULL,
    "chariotId" TEXT NOT NULL,

    CONSTRAINT "AutoclaveCycleChariot_pkey" PRIMARY KEY ("cycleId","chariotId")
);

-- CreateTable
CREATE TABLE "SterilizationTicket" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "mlSummary" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'READY_FOR_PACKAGING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SterilizationTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineEntry" (
    "id" TEXT NOT NULL,
    "paletteId" TEXT NOT NULL,
    "ligneId" TEXT NOT NULL,
    "cheffeMatricule" TEXT NOT NULL,
    "article" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagingRecord" (
    "id" TEXT NOT NULL,
    "sterilizationTicketId" TEXT NOT NULL,
    "cheffeMatricule" TEXT NOT NULL,
    "packagingLine" TEXT NOT NULL,
    "shift" TEXT NOT NULL,
    "actualBoxCount" INTEGER NOT NULL,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "PackagingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColdStorageIndicator" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "palettesIn" INTEGER NOT NULL,
    "palettesOut" INTEGER NOT NULL,
    "stockLevel" INTEGER NOT NULL,
    "avgStorageHours" DOUBLE PRECISION NOT NULL,
    "occupancyPct" DOUBLE PRECISION NOT NULL,
    "mlForecast" INTEGER,

    CONSTRAINT "ColdStorageIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChambreShift" (
    "id" TEXT NOT NULL,
    "operatorMatricule" TEXT NOT NULL,
    "chefTapis1" TEXT NOT NULL,
    "chefTapis2" TEXT NOT NULL,
    "chefTapis3" TEXT NOT NULL,
    "chefTapis4" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "ChambreShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MLModel" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "trainingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "algorithm" TEXT NOT NULL DEFAULT 'IsolationForest',
    "accuracy" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "modelPath" TEXT NOT NULL,
    "features" TEXT,

    CONSTRAINT "MLModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowNotification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recipientRole" "UserRole" NOT NULL,
    "recipientModule" "ModuleType",
    "relatedEntity" TEXT,
    "relatedId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',

    CONSTRAINT "WorkflowNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fromModule" "ModuleType" NOT NULL,
    "toModule" "ModuleType" NOT NULL,
    "triggerEvent" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_matricule_key" ON "User"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Palette_code_key" ON "Palette"("code");

-- CreateIndex
CREATE INDEX "Palette_code_idx" ON "Palette"("code");

-- CreateIndex
CREATE INDEX "Palette_status_idx" ON "Palette"("status");

-- CreateIndex
CREATE INDEX "Palette_batchCode_idx" ON "Palette"("batchCode");

-- CreateIndex
CREATE INDEX "PaletteMovement_paletteId_idx" ON "PaletteMovement"("paletteId");

-- CreateIndex
CREATE UNIQUE INDEX "Chariot_code_key" ON "Chariot"("code");

-- CreateIndex
CREATE INDEX "Chariot_code_idx" ON "Chariot"("code");

-- CreateIndex
CREATE INDEX "Chariot_status_idx" ON "Chariot"("status");

-- CreateIndex
CREATE INDEX "AutoclaveCycle_status_idx" ON "AutoclaveCycle"("status");

-- CreateIndex
CREATE INDEX "AutoclaveCycle_autoclaveId_idx" ON "AutoclaveCycle"("autoclaveId");

-- CreateIndex
CREATE UNIQUE INDEX "SterilizationTicket_code_key" ON "SterilizationTicket"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SterilizationTicket_cycleId_key" ON "SterilizationTicket"("cycleId");

-- CreateIndex
CREATE INDEX "SterilizationTicket_code_idx" ON "SterilizationTicket"("code");

-- CreateIndex
CREATE INDEX "SterilizationTicket_status_idx" ON "SterilizationTicket"("status");

-- CreateIndex
CREATE INDEX "LineEntry_paletteId_idx" ON "LineEntry"("paletteId");

-- CreateIndex
CREATE INDEX "LineEntry_ligneId_idx" ON "LineEntry"("ligneId");

-- CreateIndex
CREATE UNIQUE INDEX "PackagingRecord_sterilizationTicketId_key" ON "PackagingRecord"("sterilizationTicketId");

-- CreateIndex
CREATE INDEX "PackagingRecord_sterilizationTicketId_idx" ON "PackagingRecord"("sterilizationTicketId");

-- CreateIndex
CREATE INDEX "ColdStorageIndicator_date_idx" ON "ColdStorageIndicator"("date");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "ChambreShift_operatorMatricule_idx" ON "ChambreShift"("operatorMatricule");

-- CreateIndex
CREATE INDEX "ChambreShift_status_idx" ON "ChambreShift"("status");

-- CreateIndex
CREATE INDEX "MLModel_isActive_idx" ON "MLModel"("isActive");

-- CreateIndex
CREATE INDEX "WorkflowNotification_recipientRole_idx" ON "WorkflowNotification"("recipientRole");

-- CreateIndex
CREATE INDEX "WorkflowNotification_isRead_idx" ON "WorkflowNotification"("isRead");

-- CreateIndex
CREATE INDEX "WorkflowNotification_createdAt_idx" ON "WorkflowNotification"("createdAt");

-- CreateIndex
CREATE INDEX "WorkflowNotification_type_idx" ON "WorkflowNotification"("type");

-- CreateIndex
CREATE INDEX "WorkflowStep_fromModule_idx" ON "WorkflowStep"("fromModule");

-- CreateIndex
CREATE INDEX "WorkflowStep_toModule_idx" ON "WorkflowStep"("toModule");

-- CreateIndex
CREATE INDEX "WorkflowStep_isActive_idx" ON "WorkflowStep"("isActive");

-- AddForeignKey
ALTER TABLE "PaletteMovement" ADD CONSTRAINT "PaletteMovement_paletteId_fkey" FOREIGN KEY ("paletteId") REFERENCES "Palette"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoclaveCycleChariot" ADD CONSTRAINT "AutoclaveCycleChariot_chariotId_fkey" FOREIGN KEY ("chariotId") REFERENCES "Chariot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoclaveCycleChariot" ADD CONSTRAINT "AutoclaveCycleChariot_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AutoclaveCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SterilizationTicket" ADD CONSTRAINT "SterilizationTicket_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AutoclaveCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineEntry" ADD CONSTRAINT "LineEntry_paletteId_fkey" FOREIGN KEY ("paletteId") REFERENCES "Palette"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagingRecord" ADD CONSTRAINT "PackagingRecord_sterilizationTicketId_fkey" FOREIGN KEY ("sterilizationTicketId") REFERENCES "SterilizationTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
