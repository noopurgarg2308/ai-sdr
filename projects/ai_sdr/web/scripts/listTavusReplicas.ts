import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { getTavusClient } from "../src/lib/tavus";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🔍 Listing Tavus Replicas\n");

  // Check database first (skip if migration not run)
  console.log("1️⃣  Checking database for configured replicas...");
  let companies: any[] = [];
  let companiesWithReplicas: any[] = [];
  
  try {
    companies = await prisma.company.findMany();
    companiesWithReplicas = companies.filter((c: any) => c.tavusReplicaId);
    if (companiesWithReplicas.length > 0) {
      console.log(`   Found ${companiesWithReplicas.length} company/ies with replica IDs:\n`);
      companiesWithReplicas.forEach((c: any) => {
        console.log(`   - ${c.displayName} (${c.slug})`);
        console.log(`     Replica ID: ${c.tavusReplicaId}`);
        console.log(`     Video: ${c.useTavusVideo ? "✅" : "❌"}, KB: ${c.useTavusKB ? "✅" : "❌"}`);
        console.log();
      });
    } else {
      console.log("   ❌ No companies have replica IDs configured yet\n");
    }
  } catch (error: any) {
    if (error.message?.includes("does not exist")) {
      console.log("   ⚠️  Database migration not run yet - Tavus fields don't exist in DB");
      console.log("   Run: npm run prisma:migrate\n");
    } else {
      throw error;
    }
  }

  // Now list all replicas from Tavus
  console.log("2️⃣  Fetching replicas from Tavus API...");
  const client = getTavusClient();
  if (!client) {
    console.log("   ❌ Tavus client not available");
    return;
  }

  try {
    const response = await fetch("https://tavusapi.com/v2/replicas", {
      method: "GET",
      headers: {
        "x-api-key": process.env.TAVUS_API_KEY!,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ❌ Failed to fetch replicas: ${response.status}`);
      console.log(`   Error: ${errorText}`);
      return;
    }

    const data = await response.json();
    const replicas = data.replicas || data.data || [];

    console.log(`   ✅ Found ${replicas.length} replica(s) in your Tavus account\n`);

    if (replicas.length === 0) {
      console.log("   No replicas found. You'll need to create one in the Tavus dashboard.");
      return;
    }

    // Show first 10 replicas with details
    console.log("3️⃣  Replica Details (showing first 10):\n");
    replicas.slice(0, 10).forEach((replica: any, index: number) => {
      console.log(`   ${index + 1}. Replica ID: ${replica.id || replica.replica_id || "N/A"}`);
      console.log(`      Name: ${replica.name || "N/A"}`);
      console.log(`      Status: ${replica.status || "N/A"}`);
      if (replica.created_at) {
        console.log(`      Created: ${replica.created_at}`);
      }
      if (replica.description) {
        console.log(`      Description: ${replica.description.substring(0, 100)}...`);
      }
      console.log();
    });

    if (replicas.length > 10) {
      console.log(`   ... and ${replicas.length - 10} more replicas\n`);
    }

    // Show which replicas are already in use
    if (companiesWithReplicas.length > 0) {
      console.log("4️⃣  Replica Usage:\n");
      companiesWithReplicas.forEach((company: any) => {
        const replica = replicas.find(
          (r: any) => (r.id || r.replica_id) === company.tavusReplicaId
        );
        if (replica) {
          console.log(`   ✅ ${company.tavusReplicaId} is used by: ${company.displayName}`);
        } else {
          console.log(`   ⚠️  ${company.tavusReplicaId} (configured but not found in Tavus)`);
        }
      });
      console.log();
    }

    console.log("\n💡 To use a replica:");
    console.log("   1. Pick a replica ID from above");
    console.log("   2. Update your company in the database:");
    console.log("      await prisma.company.update({");
    console.log("        where: { slug: 'your-company-slug' },");
    console.log("        data: {");
    console.log("          tavusReplicaId: 'replica-id-here',");
    console.log("          useTavusVideo: true,");
    console.log("          useTavusKB: true,");
    console.log("        }");
    console.log("      });");
  } catch (error: any) {
    console.error("   ❌ Error fetching replicas:", error.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

