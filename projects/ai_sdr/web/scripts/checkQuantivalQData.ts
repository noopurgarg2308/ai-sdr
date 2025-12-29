import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🔍 Checking QuantivalQ data in database...\n");

  // Look up the company
  const company = await prisma.company.findUnique({
    where: { slug: "quantivalq" },
    include: {
      documents: {
        select: {
          id: true,
          title: true,
          source: true,
          createdAt: true,
          _count: {
            select: { chunks: true },
          },
        },
      },
      mediaAssets: {
        select: {
          id: true,
          type: true,
          title: true,
          processingStatus: true,
          createdAt: true,
        },
      },
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
    console.error('   Please create the company first by running: npm run create:quantivalq');
    process.exit(1);
  }

  console.log(`✅ Company: ${company.displayName}`);
  console.log(`   ID: ${company.id}`);
  console.log(`   Slug: ${company.slug}`);
  console.log(`   Created: ${company.createdAt}\n`);

  console.log("=".repeat(60));
  console.log("📊 Statistics:");
  console.log(`   Documents: ${company._count.documents}`);
  console.log(`   Chunks: ${company._count.chunks}`);
  console.log(`   Media Assets: ${company._count.mediaAssets}`);
  console.log("=".repeat(60));

  if (company.documents.length > 0) {
    console.log("\n📄 Documents:");
    company.documents.forEach((doc, index) => {
      console.log(`\n   ${index + 1}. ${doc.title}`);
      console.log(`      ID: ${doc.id}`);
      console.log(`      Source: ${doc.source || "unknown"}`);
      console.log(`      Chunks: ${doc._count.chunks}`);
      console.log(`      Created: ${doc.createdAt.toISOString()}`);
    });
  } else {
    console.log("\n⚠️  No documents found!");
    console.log("   Run: npm run seed:quantivalq:docs");
  }

  if (company.mediaAssets.length > 0) {
    console.log("\n🎨 Media Assets:");
    company.mediaAssets.forEach((asset, index) => {
      console.log(`\n   ${index + 1}. ${asset.title}`);
      console.log(`      Type: ${asset.type}`);
      console.log(`      Status: ${asset.processingStatus || "pending"}`);
      console.log(`      Created: ${asset.createdAt.toISOString()}`);
    });
  } else {
    console.log("\n⚠️  No media assets found!");
    console.log("   Run: npm run seed:quantivalq:images");
  }

  console.log("\n" + "=".repeat(60));
  console.log("🧪 Testing:");
  if (company._count.documents > 0) {
    console.log("   ✅ You can test the widget at: http://localhost:3000/widget/quantivalq");
    console.log("   ✅ Documents are ready for RAG search");
  } else {
    console.log("   ⚠️  No documents available for RAG search");
    console.log("   📝 Add documents first, then test the widget");
  }
  console.log("=".repeat(60));
}

main()
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
