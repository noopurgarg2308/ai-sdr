-- AlterTable
ALTER TABLE "Chunk" ADD COLUMN "metadata" TEXT;

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN "extractedText" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN "frameAnalysis" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN "processedAt" DATETIME;
ALTER TABLE "MediaAsset" ADD COLUMN "processingStatus" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN "transcript" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mediaAssetId" TEXT,
    CONSTRAINT "Document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("companyId", "content", "createdAt", "id", "source", "title") SELECT "companyId", "content", "createdAt", "id", "source", "title" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE INDEX "Document_companyId_idx" ON "Document"("companyId");
CREATE INDEX "Document_mediaAssetId_idx" ON "Document"("mediaAssetId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MediaAsset_processingStatus_idx" ON "MediaAsset"("processingStatus");
