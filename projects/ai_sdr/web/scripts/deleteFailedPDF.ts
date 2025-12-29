import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🗑️  Deleting failed PDF record...\n");

  // Look up the company
  const company = await prisma.company.findUnique({
    where: { slug: "quantivalq" },
  });

  if (!company) {
    console.error('❌ Error: Company with slug "quantivalq" not found.');
    process.exit(1);
  }

  // Find failed PDF
  const failedPDF = await prisma.mediaAsset.findFirst({
    where: {
      companyId: company.id,
      type: "pdf",
      processingStatus: "failed",
    },
  });

  if (!failedPDF) {
    console.log("✅ No failed PDF found. All PDFs are either processed or pending.");
    return;
  }

  console.log(`Found failed PDF:`);
  console.log(`   Title: ${failedPDF.title}`);
  console.log(`   ID: ${failedPDF.id}`);
  console.log(`   URL: ${failedPDF.url}`);
  console.log(`   Uploaded: ${new Date(failedPDF.createdAt).toLocaleString()}\n`);

  // Delete the failed PDF
  await prisma.mediaAsset.delete({
    where: { id: failedPDF.id },
  });

  console.log("✅ Successfully deleted failed PDF record!");
  console.log(`\n📊 Remaining PDFs:`);
  
  const remainingPDFs = await prisma.mediaAsset.findMany({
    where: {
      companyId: company.id,
      type: "pdf",
    },
    select: {
      id: true,
      title: true,
      processingStatus: true,
    },
  });

  remainingPDFs.forEach((pdf, idx) => {
    console.log(`   ${idx + 1}. ${pdf.title} (${pdf.processingStatus || "pending"})`);
  });
}

main()
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
