import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { ingestCompanyDoc } from "../src/lib/rag";

/**
 * Upload text documents for QuantivalQ
 * 
 * Usage:
 * 1. Create a folder: scripts/quantivalq-docs/
 * 2. Put your .txt or .md files in that folder
 * 3. Run: npm run upload:quantivalq:text
 * 
 * Or provide file paths as arguments:
 * npm run upload:quantivalq:text path/to/file1.txt path/to/file2.txt
 */

async function main() {
  console.log("📄 Uploading text documents for QuantivalQ...\n");

  // Look up the company
  const company = await prisma.company.findUnique({
    where: { slug: "quantivalq" },
  });

  if (!company) {
    console.error('❌ Error: Company with slug "quantivalq" not found.');
    process.exit(1);
  }

  console.log(`✓ Found company: ${company.displayName} (${company.id})\n`);

  // Get file paths from command line args or default folder
  const args = process.argv.slice(2);
  let filePaths: string[] = [];

  if (args.length > 0) {
    // Use provided file paths
    filePaths = args;
  } else {
    // Look for files in scripts/quantivalq-docs/ folder
    const docsFolder = path.join(process.cwd(), "scripts", "quantivalq-docs");
    if (fs.existsSync(docsFolder)) {
      const files = fs.readdirSync(docsFolder);
      filePaths = files
        .filter((f) => f.endsWith(".txt") || f.endsWith(".md") || f.endsWith(".text"))
        .map((f) => path.join(docsFolder, f));
    } else {
      console.log("📁 No files found. Options:");
      console.log("   1. Create folder: scripts/quantivalq-docs/ and add .txt or .md files");
      console.log("   2. Or run with file paths: npm run upload:quantivalq:text path/to/file.txt\n");
      process.exit(0);
    }
  }

  if (filePaths.length === 0) {
    console.error("❌ No text files found to upload.");
    process.exit(1);
  }

  console.log(`📚 Found ${filePaths.length} file(s) to upload:\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const filePath of filePaths) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error(`✗ File not found: ${filePath}`);
        errorCount++;
        continue;
      }

      // Read file content
      const content = fs.readFileSync(filePath, "utf-8");
      const filename = path.basename(filePath);
      const title = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

      console.log(`📄 Processing: ${filename}`);

      // Ingest document
      const document = await ingestCompanyDoc({
        companyId: company.id,
        title: title,
        source: "upload",
        content: content,
      });

      console.log(`   ✅ Uploaded: ${document.title} (${document.id})`);
      successCount++;
    } catch (error) {
      console.error(`   ✗ Error uploading ${filePath}:`, error);
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Upload complete!");
  console.log(`   Successfully uploaded: ${successCount} documents`);
  if (errorCount > 0) {
    console.log(`   Failed: ${errorCount} documents`);
  }
  console.log("=".repeat(60));
  console.log("\n📝 Next steps:");
  console.log("   1. Test RAG: npm run test:quantivalq:rag");
  console.log("   2. Test widget: http://localhost:3000/widget/quantivalq");
}

main()
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
