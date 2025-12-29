import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { queueMediaProcessing } from "../src/lib/queue";
import { addMediaAsset } from "../src/lib/media";

const QUANTIVALQ_COMPANY_ID = "cmj52tf810000w3lw1rvkkieh";

async function uploadPDF(filePath: string, title: string, description?: string) {
  console.log(`\n📄 Uploading: ${title}`);
  console.log(`   File: ${filePath}`);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Copy file to uploads directory
  const uploadDir = path.join(process.cwd(), "public", "uploads", "pdfs");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const timestamp = Date.now();
  const originalName = path.basename(filePath).replace(/\s+/g, "-");
  const filename = `${timestamp}-${originalName}`;
  const destPath = path.join(uploadDir, filename);

  // Copy file
  fs.copyFileSync(filePath, destPath);
  console.log(`   📋 Copied to: ${destPath}`);

  // Create public URL
  const publicUrl = `/uploads/pdfs/${filename}`;

  // Get file stats
  const stats = fs.statSync(destPath);

  // Create media asset
  const asset = await addMediaAsset({
    companyId: QUANTIVALQ_COMPANY_ID,
    type: "pdf",
    url: publicUrl,
    title,
    description: description || undefined,
    category: "company-info",
    metadata: {
      originalFilename: originalName,
      fileSize: stats.size,
      mimeType: "application/pdf",
      uploadedAt: new Date().toISOString(),
    },
  });

  console.log(`   ✅ Created MediaAsset: ${asset.id}`);

  // Queue for processing (extract text + slides)
  const jobId = await queueMediaProcessing(
    asset.id,
    QUANTIVALQ_COMPANY_ID,
    "pdf"
  );
  console.log(`   🔄 Queued for processing: job ${jobId}`);

  return { asset, jobId };
}

async function main() {
  console.log("🚀 Starting Airbnb PDF uploads...\n");

  const pdfsDir = path.join(process.cwd(), "downloads", "airbnb-presentations");
  
  if (!fs.existsSync(pdfsDir)) {
    console.error(`❌ Directory not found: ${pdfsDir}`);
    process.exit(1);
  }

  const pdfs = [
    {
      file: "airbnb-q1-2024-shareholder-letter.pdf",
      title: "Airbnb Q1 2024 Shareholder Letter",
      description: "Q1 2024 quarterly shareholder letter with financial results and company updates",
    },
    {
      file: "airbnb-q2-2024-shareholder-letter.pdf",
      title: "Airbnb Q2 2024 Shareholder Letter",
      description: "Q2 2024 quarterly shareholder letter with financial results and company updates",
    },
  ];

  let successCount = 0;
  let failCount = 0;

  for (const pdf of pdfs) {
    const filePath = path.join(pdfsDir, pdf.file);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      failCount++;
      continue;
    }

    try {
      await uploadPDF(filePath, pdf.title, pdf.description);
      successCount++;
      // Small delay between uploads
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`   ❌ Error:`, error);
      failCount++;
    }
  }

  console.log(`\n📊 Upload Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`\n💡 Processing will happen in the background.`);
  console.log(`   - Text extraction will start immediately`);
  console.log(`   - Slide extraction will start if dependencies are installed`);
  console.log(`   - Check status: http://localhost:3000/admin/companies/${QUANTIVALQ_COMPANY_ID}/media`);
  
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
