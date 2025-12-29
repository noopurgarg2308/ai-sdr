import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { getTavusClient } from "../src/lib/tavus";
import { hybridSearch } from "../src/lib/hybridSearch";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🧪 Testing Complete Tavus Integration\n");

  // Get the hypersonix company
  const company = await prisma.company.findUnique({
    where: { slug: "hypersonix" },
  });

  if (!company) {
    console.log("❌ Company 'hypersonix' not found");
    return;
  }

  console.log(`Company: ${company.displayName}`);
  console.log(`Replica ID: ${company.tavusReplicaId}`);
  console.log(`Tavus KB Enabled: ${company.useTavusKB}`);
  console.log(`Tavus Video Enabled: ${company.useTavusVideo}`);
  console.log(`Search Strategy: ${company.searchStrategy}\n`);

  // Test 1: Knowledge Base Search
  console.log("1️⃣  Testing Tavus Knowledge Base Search...");
  try {
    const tavusClient = getTavusClient();
    if (!tavusClient) {
      console.log("❌ Tavus client not available");
      return;
    }

    const kbResults = await tavusClient.searchKnowledgeBase(
      company.tavusReplicaId!,
      "What is pricing optimization?",
      { limit: 3 }
    );

    console.log(`✅ Found ${kbResults.length} results from Tavus KB:`);
    kbResults.forEach((r, i) => {
      console.log(`   ${i + 1}. Score: ${r.score.toFixed(3)}`);
      console.log(`      Content: ${r.content.substring(0, 100)}...`);
    });
  } catch (error: any) {
    console.log(`❌ KB Search Error: ${error.message}`);
    console.log(`   This might mean:`);
    console.log(`   - The knowledge base endpoint needs adjustment`);
    console.log(`   - The replica doesn't have a knowledge base configured`);
    console.log(`   - The API response format is different than expected`);
  }

  console.log("\n2️⃣  Testing Hybrid Search (Tavus + Your RAG)...");
  try {
    const hybridResults = await hybridSearch(company.id, "What is pricing optimization?", {
      limit: 5,
    });

    console.log(`✅ Hybrid search completed!`);
    console.log(`   Strategy: ${hybridResults.metadata.strategy}`);
    console.log(`   Tavus Results: ${hybridResults.metadata.tavusResults}`);
    console.log(`   RAG Results: ${hybridResults.metadata.ragResults}`);
    console.log(`   Total Results: ${hybridResults.results.length}`);
    console.log(`   Latency: ${hybridResults.metadata.latency}ms`);
    console.log(`   Linked Visuals: ${hybridResults.linkedVisuals.length}`);
    console.log(`   Visual Results: ${hybridResults.visualResults.length}`);

    if (hybridResults.results.length > 0) {
      console.log(`\n   Top result:`);
      const top = hybridResults.results[0];
      console.log(`   - Source: ${top.source}`);
      console.log(`   - Score: ${top.score.toFixed(3)}`);
      console.log(`   - Content: ${top.content.substring(0, 150)}...`);
    }
  } catch (error: any) {
    console.log(`❌ Hybrid Search Error: ${error.message}`);
  }

  console.log("\n3️⃣  Testing CVI Session Creation...");
  try {
    const tavusClient = getTavusClient();
    if (!tavusClient) {
      console.log("❌ Tavus client not available");
      return;
    }

    const session = await tavusClient.createCVISession({
      replicaId: company.tavusReplicaId!,
      personaId: company.tavusPersonaId,
      callbackUrl: process.env.NEXT_PUBLIC_BASE_URL
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/tavus/callback`
        : "http://localhost:3000/api/tavus/callback",
    });

    console.log(`✅ CVI Session created successfully!`);
    console.log(`   Session ID: ${session.sessionId}`);
    console.log(`   WebSocket URL: ${session.websocketUrl.substring(0, 80)}...`);
    console.log(`\n   You can now use this session ID to connect via WebSocket.`);
  } catch (error: any) {
    console.log(`❌ CVI Session Error: ${error.message}`);
    console.log(`   This might mean:`);
    console.log(`   - The CVI endpoint needs adjustment`);
    console.log(`   - The API request format is different`);
    console.log(`   - Check Tavus API documentation for correct endpoint`);
  }

  console.log("\n✅ Integration test complete!");
  console.log("\nNext steps:");
  console.log("1. If KB search worked, test it in the widget");
  console.log("2. If CVI session worked, test video avatar in widget");
  console.log("3. Visit: http://localhost:3000/widget/hypersonix");
  console.log("4. Try asking questions and using Video Avatar mode");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

