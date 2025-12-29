-- Add website support fields (additive, backwards compatible)

-- Add url and headingsPath to Document table (nullable for backwards compatibility)
ALTER TABLE "Document" ADD COLUMN "url" TEXT;
ALTER TABLE "Document" ADD COLUMN "headingsPath" TEXT;

-- Create index on url for faster lookups
CREATE INDEX IF NOT EXISTS "Document_url_idx" ON "Document"("url");
