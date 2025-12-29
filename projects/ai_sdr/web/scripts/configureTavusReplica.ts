import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { prisma } from "../src/lib/prisma";

async function main() {
  const companySlug = process.argv[2] || "hypersonix";
  const replicaId = process.argv[3] || "rfcc944ac6"; // First replica as default

  console.log(`🔧 Configuring Tavus replica for company: ${companySlug}\n`);

  try {
    const company = await prisma.company.findUnique({
      where: { slug: companySlug },
    });

    if (!company) {
      console.log(`❌ Company "${companySlug}" not found`);
      return;
    }

    console.log(`   Company: ${company.displayName}`);
    console.log(`   Replica ID: ${replicaId}`);
    console.log();

    // Update company with Tavus configuration
    const updated = await prisma.company.update({
      where: { slug: companySlug },
      data: {
        tavusReplicaId: replicaId,
        useTavusVideo: true,
        useTavusKB: true,
        searchStrategy: "parallel",
        tavusKBWeight: 0.5,
      },
    });

    console.log("✅ Company configured successfully!\n");
    console.log("Configuration:");
    console.log(`   - Replica ID: ${updated.tavusReplicaId}`);
    console.log(`   - Video Avatar: ${updated.useTavusVideo ? "✅ Enabled" : "❌ Disabled"}`);
    console.log(`   - Knowledge Base: ${updated.useTavusKB ? "✅ Enabled" : "❌ Disabled"}`);
    console.log(`   - Search Strategy: ${updated.searchStrategy}`);
    console.log(`   - Tavus KB Weight: ${updated.tavusKBWeight}`);
    console.log("\n🎉 You can now test the Tavus integration!");
    console.log(`   Visit: http://localhost:3000/widget/${companySlug}`);
    console.log(`   Select "Video Avatar" mode in the widget.`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.message?.includes("does not exist")) {
      console.log("\n💡 Make sure you've run the migration:");
      console.log("   npm run prisma:migrate");
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

