import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { getTavusClient } from "../src/lib/tavus";

async function main() {
  const apiKey = process.env.TAVUS_API_KEY!;
  
  console.log("🔍 Fetching detailed replica information...\n");

  try {
    // Get all replicas
    const response = await fetch("https://tavusapi.com/v2/replicas", {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const data = await response.json();
    const replicas = data.replicas || data.data || [];

    console.log(`Found ${replicas.length} replicas\n`);

    // Try to get details for each replica to find women
    const client = getTavusClient();
    if (!client) {
      throw new Error("Tavus client not available");
    }

    console.log("Checking replicas for gender indicators (name, description)...\n");
    
    const womenReplicas: any[] = [];
    const otherReplicas: any[] = [];

    // Check first 20 replicas in detail
    for (const replica of replicas.slice(0, 20)) {
      const replicaId = replica.id || replica.replica_id;
      if (!replicaId) continue;

      try {
        const details = await client.getReplica(replicaId);
        
        // Check for gender indicators in name, description, or other fields
        const name = (details.name || "").toLowerCase();
        const description = (details.description || "").toLowerCase();
        const fullText = `${name} ${description}`;
        
        // Simple heuristic - look for common female names or indicators
        const femaleIndicators = [
          "she", "her", "woman", "female", "girl", "lady", "sarah", "emily", 
          "jessica", "jennifer", "lisa", "maria", "anna", "sophia", "olivia",
          "amy", "kate", "rachel", "michelle", "laura", "nicole", "stephanie"
        ];
        
        const isLikelyWoman = femaleIndicators.some(indicator => 
          fullText.includes(indicator)
        );

        const replicaInfo = {
          id: replicaId,
          name: details.name || "N/A",
          description: details.description || "N/A",
          status: details.status || replica.status,
          created: details.created_at || replica.created_at,
        };

        if (isLikelyWoman || name.includes("female") || description.includes("female")) {
          womenReplicas.push(replicaInfo);
        } else {
          otherReplicas.push(replicaInfo);
        }
      } catch (error: any) {
        // If we can't get details, skip
        console.log(`  ⚠️  Could not get details for ${replicaId}: ${error.message}`);
      }
    }

    if (womenReplicas.length > 0) {
      console.log(`\n✅ Found ${womenReplicas.length} likely woman replica(s):\n`);
      womenReplicas.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.id}`);
        console.log(`      Name: ${r.name}`);
        console.log(`      Description: ${r.description.substring(0, 100)}${r.description.length > 100 ? '...' : ''}`);
        console.log();
      });
    } else {
      console.log("\n⚠️  Could not identify woman replicas from names/descriptions");
      console.log("   Showing first few replicas - you may need to check manually:\n");
      replicas.slice(0, 5).forEach((r: any, i: number) => {
        console.log(`   ${i + 1}. ${r.id || r.replica_id}`);
        console.log(`      Status: ${r.status}`);
        console.log();
      });
    }

    // If we found women replicas, suggest the first one
    if (womenReplicas.length > 0) {
      console.log(`\n💡 Suggested replica: ${womenReplicas[0].id}`);
      console.log(`   Use this ID to configure your company.`);
    }

  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

main().catch(console.error);

