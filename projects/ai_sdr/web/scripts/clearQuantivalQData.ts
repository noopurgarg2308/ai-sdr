import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🗑️  Clearing QuantivalQ data...\n");

  // Look up the company
  const company = await prisma.company.findUnique({
    where: { slug: "quantivalq" },
    include: {
      _count: {
        select: {
          documents: true,
          chunks: true,
          mediaAssets: true,
        },
      },
    },
  });

  if (!company) {
    console.error('❌ Error: Company with slug "quantivalq" not found.');
    process.exit(1);
  }

  console.log(`Found company: ${company.displayName}`);
  console.log(`   Documents: ${company._count.documents}`);
  console.log(`   Chunks: ${company._count.chunks}`);
  console.log(`   Media Assets: ${company._count.mediaAssets}\n`);

  if (company._count.documents === 0 && company._count.mediaAssets === 0) {
    console.log("✅ No data to clear. Company is already empty.");
    return;
  }

  // Delete in correct order (chunks first due to foreign key constraints)
  console.log("Deleting chunks...");
  const deletedChunks = await prisma.chunk.deleteMany({
    where: { companyId: company.id },
  });
  console.log(`   ✅ Deleted ${deletedChunks.count} chunks`);

  console.log("Deleting documents...");
  const deletedDocs = await prisma.document.deleteMany({
    where: { companyId: company.id },
  });
  console.log(`   ✅ Deleted ${deletedDocs.count} documents`);

  console.log("Deleting media assets...");
  const deletedAssets = await prisma.mediaAsset.deleteMany({
    where: { companyId: company.id },
  });
  console.log(`   ✅ Deleted ${deletedAssets.count} media assets`);

  console.log("\n✅ All QuantivalQ data cleared!");
  console.log("\n📝 Next steps:");
  console.log("   1. Test widget without documents: http://localhost:3000/widget/quantivalq");
  console.log("   2. Add documents when ready: npm run seed:quantivalq:docs");
}

main()
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
