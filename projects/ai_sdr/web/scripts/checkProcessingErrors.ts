import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

const QUANTIVALQ_COMPANY_ID = "cmj52tf810000w3lw1rvkkieh";

async function main() {
  console.log("🔍 Checking for processing errors...\n");

  // Check PDFs with failed status
  const failedPDFs = await prisma.mediaAsset.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "pdf",
      processingStatus: "failed",
    },
  });

  console.log(`❌ Failed PDFs: ${failedPDFs.length}\n`);

  for (const pdf of failedPDFs) {
    console.log(`📄 ${pdf.title}`);
    console.log(`   ID: ${pdf.id}`);
    const metadata = pdf.metadata ? JSON.parse(pdf.metadata) : {};
    const error = metadata.error || "Unknown error";
    console.log(`   Error: ${error}`);
    console.log();
  }

  // Check slides with failed status
  const failedSlides = await prisma.mediaAsset.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "slide",
      processingStatus: "failed",
    },
    take: 10,
  });

  console.log(`\n❌ Failed Slides: ${failedSlides.length} (showing first 10)\n`);

  for (const slide of failedSlides.slice(0, 10)) {
    console.log(`📄 ${slide.title}`);
    const metadata = slide.metadata ? JSON.parse(slide.metadata) : {};
    const error = metadata.error || "Unknown error";
    console.log(`   Error: ${error}`);
    console.log();
  }

  // Check PDFs stuck in processing
  const processingPDFs = await prisma.mediaAsset.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "pdf",
      processingStatus: "processing",
    },
  });

  console.log(`\n🔄 Stuck in Processing: ${processingPDFs.length} PDFs\n`);

  for (const pdf of processingPDFs) {
    console.log(`📄 ${pdf.title}`);
    console.log(`   ID: ${pdf.id}`);
    console.log(`   Created: ${pdf.createdAt}`);
    const now = new Date();
    const created = new Date(pdf.createdAt);
    const hoursAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    console.log(`   Stuck for: ${hoursAgo.toFixed(1)} hours`);
    console.log();
  }

  // Check slides stuck in processing
  const processingSlides = await prisma.mediaAsset.findMany({
    where: {
      companyId: QUANTIVALQ_COMPANY_ID,
      type: "slide",
      processingStatus: "processing",
    },
    take: 10,
  });

  console.log(`\n🔄 Stuck Slides: ${processingSlides.length} (showing first 10)\n`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
