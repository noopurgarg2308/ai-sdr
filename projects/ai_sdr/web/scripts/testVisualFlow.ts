import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { dispatchToolCall } from "../src/lib/tools";

const QUANTIVALQ_COMPANY_ID = "cmj52tf810000w3lw1rvkkieh";

async function main() {
  console.log("🔍 Testing complete visual flow...\n");

  const query = "What were Airbnb's financial results in Q1 2024?";
  
  // Step 1: Test search_knowledge tool directly
  console.log("1. Testing search_knowledge tool...");
  try {
    const result = await dispatchToolCall(
      QUANTIVALQ_COMPANY_ID as any,
      "search_knowledge",
      { query }
    );
    
    console.log(`   ✅ Tool executed successfully`);
    console.log(`   Results: ${result.results?.length || 0}`);
    console.log(`   Linked visuals: ${result.linkedVisuals?.length || 0}`);
    console.log(`   Visual results: ${result.visualResults?.length || 0}\n`);
    
    if (result.linkedVisuals && result.linkedVisuals.length > 0) {
      console.log("   Linked visuals details:");
      result.linkedVisuals.forEach((v: any, i: number) => {
        console.log(`   ${i + 1}. ${v.title} (${v.type})`);
        console.log(`      URL: ${v.url}`);
      });
    } else {
      console.log("   ❌ NO linked visuals returned!");
    }
    
    // Check if results have mediaAssetIds
    const resultsWithMedia = result.results?.filter((r: any) => r.mediaAssetId) || [];
    console.log(`\n   Results with mediaAssetId: ${resultsWithMedia.length}`);
    if (resultsWithMedia.length > 0) {
      resultsWithMedia.forEach((r: any, i: number) => {
        console.log(`   ${i + 1}. mediaAssetId: ${r.mediaAssetId}, pageNumber: ${r.pageNumber || "none"}`);
      });
    }
    
  } catch (error) {
    console.error("   ❌ Error:", error);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
