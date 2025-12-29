import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { searchKnowledge } from "../src/lib/rag";

const QUANTIVALQ_COMPANY_ID = "cmj52tf810000w3lw1rvkkieh";

async function main() {
  console.log("🔍 Testing search for 'What were Airbnb's financial results in Q1 2024?'\n");

  const query = "What were Airbnb's financial results in Q1 2024?";

  const results = await searchKnowledge({
    companyId: QUANTIVALQ_COMPANY_ID,
    query,
    limit: 10, // Get more results
  });

  console.log(`📊 Search returned ${results.length} results:\n`);

  results.forEach((r, i) => {
    console.log(`${i + 1}. Score: ${r.score.toFixed(4)}`);
    console.log(`   Contains "Q1 2024": ${r.content.toLowerCase().includes("q1 2024") ? "✅ YES" : "❌ NO"}`);
    console.log(`   Contains "financial": ${r.content.toLowerCase().includes("financial") ? "✅ YES" : "❌ NO"}`);
    console.log(`   Contains "revenue": ${r.content.toLowerCase().includes("revenue") ? "✅ YES" : "❌ NO"}`);
    console.log(`   Media Asset ID: ${r.mediaAssetId || "None"}`);
    console.log(`   Preview: ${r.content.substring(0, 200).replace(/\n/g, " ")}...`);
    console.log("");
  });

  // Check if top 3 contain Q1 2024
  const top3HasQ1 = results.slice(0, 3).some(r => r.content.toLowerCase().includes("q1 2024"));
  console.log(`\n${top3HasQ1 ? "✅" : "❌"} Top 3 results contain Q1 2024: ${top3HasQ1 ? "YES" : "NO"}`);

  // Check if any result has Q1 2024
  const anyHasQ1 = results.some(r => r.content.toLowerCase().includes("q1 2024"));
  console.log(`${anyHasQ1 ? "✅" : "❌"} Any result contains Q1 2024: ${anyHasQ1 ? "YES" : "NO"}`);

  await prisma.$disconnect();
}

main().catch(console.error);
