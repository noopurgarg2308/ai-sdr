-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "config" JSONB NOT NULL,
    "ownerEmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "useVisuals" BOOLEAN NOT NULL DEFAULT false,
    "useTextChat" BOOLEAN NOT NULL DEFAULT false,
    "billingTier" TEXT,
    "openaiApiKey" TEXT,
    "tavusReplicaId" TEXT,
    "tavusPersonaId" TEXT,
    "useTavusKB" BOOLEAN NOT NULL DEFAULT false,
    "useTavusVideo" BOOLEAN NOT NULL DEFAULT false,
    "searchStrategy" TEXT NOT NULL DEFAULT 'parallel',
    "tavusKBWeight" REAL NOT NULL DEFAULT 0.5
);
INSERT INTO "new_Company" ("billingTier", "config", "createdAt", "displayName", "id", "openaiApiKey", "ownerEmail", "searchStrategy", "shortDescription", "slug", "tavusKBWeight", "tavusPersonaId", "tavusReplicaId", "updatedAt", "useTavusKB", "useTavusVideo", "useVisuals", "websiteUrl") SELECT "billingTier", "config", "createdAt", "displayName", "id", "openaiApiKey", "ownerEmail", "searchStrategy", "shortDescription", "slug", "tavusKBWeight", "tavusPersonaId", "tavusReplicaId", "updatedAt", "useTavusKB", "useTavusVideo", "useVisuals", "websiteUrl" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
