import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { searchMediaAssets } from "../src/lib/media";

async function main() {
  console.log("🖼️  Testing QuantivalQ image search...\n");

  // Look up the company
  const company = await prisma.company.findUnique({
    where: { slug: "quantivalq" },
  });

  if (!company) {
    console.error('❌ Error: Company with slug "quantivalq" not found.');
    process.exit(1);
  }

  console.log(`✓ Found company: ${company.displayName} (${company.id})\n`);

  // Test queries that should return images
  const testQueries = [
    "dashboard",
    "pricing",
    "architecture",
    "machine learning",
  ];

  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"`);
    console.log("─".repeat(60));

    try {
      const results = await searchMediaAssets({
        companyId: company.id,
        query,
        limit: 3,
      });

      if (results.length === 0) {
        console.log("   ⚠️  No images found");
      } else {
        console.log(`   ✅ Found ${results.length} images:\n`);
        results.forEach((asset, index) => {
          console.log(`   ${index + 1}. ${asset.title}`);
          console.log(`      Type: ${asset.type}`);
          console.log(`      URL: ${asset.url}`);
          console.log(`      Description: ${asset.description || "N/A"}\n`);
        });
      }
    } catch (error) {
      console.error(`   ❌ Error searching:`, error);
    }
  }

  // Check all media assets
  const allAssets = await prisma.mediaAsset.findMany({
    where: { companyId: company.id },
    select: {
      id: true,
      type: true,
      url: true,
      title: true,
      description: true,
    },
  });

  console.log("\n" + "=".repeat(60));
  console.log(`📊 Total Media Assets: ${allAssets.length}`);
  console.log("=".repeat(60));

  if (allAssets.length > 0) {
    console.log("\nAll media assets:");
    allAssets.forEach((asset, index) => {
      console.log(`\n${index + 1}. ${asset.title}`);
      console.log(`   Type: ${asset.type}`);
      console.log(`   URL: ${asset.url}`);
      console.log(`   Description: ${asset.description || "N/A"}`);
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("💡 Tips:");
  console.log("   1. Ask questions like: 'Show me the dashboard' or 'Show me pricing'");
  console.log("   2. The AI should call the 'show_visual' tool");
  console.log("   3. Check browser console for image loading errors");
  console.log("   4. Placeholder URLs might not work - upload real images via admin");
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
