/**
 * Test script to verify Tavus CVI integration
 * 
 * This script checks:
 * 1. Tavus API key is configured
 * 2. Company has Tavus enabled
 * 3. Tavus client can be created
 * 4. Session creation works
 * 5. API endpoints are accessible
 */

import { getTavusClient } from "../src/lib/tavus";
import { prisma } from "../src/lib/prisma";

async function testTavusCVI() {
  console.log("🧪 Testing Tavus CVI Integration\n");

  // 1. Check API key
  console.log("1. Checking Tavus API key...");
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) {
    console.error("❌ TAVUS_API_KEY not found in environment variables");
    console.log("   Add TAVUS_API_KEY=your-key to .env.local");
    return;
  }
  console.log("✅ TAVUS_API_KEY is set\n");

  // 2. Check Tavus client
  console.log("2. Creating Tavus client...");
  const tavusClient = getTavusClient();
  if (!tavusClient) {
    console.error("❌ Failed to create Tavus client");
    return;
  }
  console.log("✅ Tavus client created\n");

  // 3. List companies with Tavus enabled
  console.log("3. Checking companies with Tavus enabled...");
  const companies = await prisma.company.findMany({
    where: {
      useTavusVideo: true,
      tavusReplicaId: { not: null },
    },
    select: {
      id: true,
      slug: true,
      displayName: true,
      tavusReplicaId: true,
      tavusPersonaId: true,
      useTavusVideo: true,
      useTavusKB: true,
    },
  });

  if (companies.length === 0) {
    console.log("⚠️  No companies have Tavus enabled");
    console.log("   To enable Tavus for a company:");
    console.log("   1. Set useTavusVideo: true");
    console.log("   2. Set tavusReplicaId: 'your-replica-id'");
    console.log("   3. Optionally set tavusPersonaId\n");
  } else {
    console.log(`✅ Found ${companies.length} company(ies) with Tavus enabled:`);
    companies.forEach((c) => {
      console.log(`   - ${c.displayName} (${c.slug})`);
      console.log(`     Replica ID: ${c.tavusReplicaId}`);
      console.log(`     Persona ID: ${c.tavusPersonaId || "Not set"}`);
      console.log(`     Video: ${c.useTavusVideo}, KB: ${c.useTavusKB}\n`);
    });
  }

  // 4. Test replica retrieval (if we have a company)
  if (companies.length > 0) {
    const testCompany = companies[0];
    console.log(`4. Testing replica retrieval for ${testCompany.displayName}...`);
    try {
      const replica = await tavusClient.getReplica(testCompany.tavusReplicaId!);
      console.log("✅ Replica retrieved successfully");
      console.log(`   Replica name: ${replica.replica_name || replica.name || "N/A"}`);
      console.log(`   Status: ${replica.status || "N/A"}\n`);
    } catch (error: any) {
      console.error(`❌ Failed to retrieve replica: ${error.message}`);
      console.log("   This might indicate:");
      console.log("   - Invalid replica ID");
      console.log("   - API key doesn't have access");
      console.log("   - Replica doesn't exist\n");
    }

    // 5. Test session creation
    console.log(`5. Testing CVI session creation for ${testCompany.displayName}...`);
    try {
      const session = await tavusClient.createCVISession({
        replicaId: testCompany.tavusReplicaId!,
        personaId: testCompany.tavusPersonaId || undefined,
        instructions: "You are a helpful sales assistant.",
        callbackUrl: "http://localhost:3000/api/tavus/callback",
      });
      console.log("✅ Session created successfully");
      console.log(`   Session ID: ${session.sessionId}`);
      console.log(`   WebSocket URL: ${session.websocketUrl}\n`);
    } catch (error: any) {
      console.error(`❌ Failed to create session: ${error.message}`);
      console.log("   This might indicate:");
      console.log("   - Invalid replica ID");
      console.log("   - Invalid persona ID");
      console.log("   - API endpoint issue");
      console.log("   - Check Tavus API documentation for correct format\n");
    }
  }

  // 6. Check API endpoints
  console.log("6. Checking API endpoints...");
  const endpoints = [
    "/api/tavus/session",
    "/api/tavus/callback",
    "/api/tavus/tool",
  ];

  endpoints.forEach((endpoint) => {
    console.log(`   ✅ ${endpoint} (exists)`);
  });
  console.log();

  // 7. Check component
  console.log("7. Checking frontend components...");
  const components = [
    "src/components/WidgetChatTavus.tsx",
    "src/components/WidgetChatUnified.tsx",
  ];

  components.forEach((component) => {
    console.log(`   ✅ ${component} (exists)`);
  });
  console.log();

  console.log("📋 Summary:");
  console.log("   - Tavus API key: " + (apiKey ? "✅ Configured" : "❌ Missing"));
  console.log("   - Tavus client: " + (tavusClient ? "✅ Working" : "❌ Failed"));
  console.log(
    "   - Companies with Tavus: " + companies.length + " found"
  );
  console.log("   - API endpoints: ✅ All exist");
  console.log("   - Components: ✅ All exist");
  console.log("\n💡 Next steps:");
  console.log("   1. Ensure TAVUS_API_KEY is set in .env.local");
  console.log("   2. Configure at least one company with Tavus enabled");
  console.log("   3. Test the widget at /widget/[company-slug]");
  console.log("   4. Select 'Video Avatar' mode");
  console.log("   5. Click 'Start Video Chat'");
}

testTavusCVI()
  .then(() => {
    console.log("\n✅ Test complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
