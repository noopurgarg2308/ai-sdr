import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { getTavusClient } from "../src/lib/tavus";

async function main() {
  console.log("🧪 Testing Tavus API Integration\n");

  // Test 1: Check if API key is loaded
  console.log("1️⃣  Checking API key...");
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) {
    console.log("❌ TAVUS_API_KEY not found in environment variables");
    console.log("   Make sure you've added it to .env.local");
    return;
  }
  console.log(`✅ API key found: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);

  // Test 2: Check if client can be created
  console.log("\n2️⃣  Creating Tavus client...");
  const client = getTavusClient();
  if (!client) {
    console.log("❌ Failed to create Tavus client");
    return;
  }
  console.log("✅ Tavus client created successfully");

  // Test 3: Test basic API connectivity
  console.log("\n3️⃣  Testing API connectivity...");
  
  // Try multiple possible endpoints to test connectivity
  const endpointsToTest = [
    { url: "https://tavusapi.com/v2/replicas", name: "List Replicas" },
    { url: "https://tavusapi.com/v2/account", name: "Account Info" },
    { url: "https://tavusapi.com/v2/conversations", name: "Conversations (POST test)", method: "POST" },
  ];

  let connectionSuccessful = false;
  let lastError: any = null;

  for (const endpoint of endpointsToTest) {
    try {
      console.log(`   Trying: ${endpoint.name} (${endpoint.url})...`);
      const response = await fetch(endpoint.url, {
        method: endpoint.method || "GET",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      // If we get any response (even error), the API is reachable
      connectionSuccessful = true;
      console.log(`   ✅ Connected! Status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ API connection successful via ${endpoint.name}!`);
        console.log(`   Response status: ${response.status}`);
        
        // If we got replicas, show them
        if (data.replicas || data.data) {
          const replicas = data.replicas || data.data || [];
          console.log(`   Found ${replicas.length} replica(s)`);
          if (replicas.length > 0) {
            console.log("\n   Available replicas:");
            replicas.slice(0, 5).forEach((r: any, i: number) => {
              console.log(`   ${i + 1}. ID: ${r.id || r.replica_id || "N/A"}`);
              console.log(`      Name: ${r.name || "N/A"}`);
            });
          }
        } else {
          console.log("   Response preview:", JSON.stringify(data, null, 2).substring(0, 200));
        }
        break; // Success, no need to try other endpoints
      } else {
        const errorText = await response.text();
        
        // If it's a 401, the key is invalid
        if (response.status === 401) {
          console.log(`   ❌ Authentication failed - API key may be invalid`);
          console.log(`   Error: ${errorText.substring(0, 200)}`);
          return;
        }
        
        // If it's 404, the endpoint doesn't exist, but auth might work
        if (response.status === 404) {
          console.log(`   ⚠️  Endpoint not found (404) - trying next endpoint...`);
          continue;
        }
        
        // Other errors
        console.log(`   ⚠️  Status ${response.status}: ${errorText.substring(0, 200)}`);
        continue;
      }
    } catch (error: any) {
      lastError = error;
      if (error.name === 'AbortError') {
        console.log(`   ⏱️  Timeout after 10 seconds`);
      } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('getaddrinfo')) {
        console.log(`   ❌ DNS resolution failed - cannot reach tavusapi.com`);
        console.log(`   This might indicate a network issue or incorrect API base URL`);
      } else {
        console.log(`   ⚠️  Error: ${error.message}`);
      }
      // Continue to next endpoint
      continue;
    }
  }

  if (!connectionSuccessful) {
    console.log(`\n❌ Could not connect to Tavus API`);
    console.log(`   Last error: ${lastError?.message || 'Unknown'}`);
    console.log(`\n   Possible issues:`);
    console.log(`   1. Network connectivity problem`);
    console.log(`   2. Incorrect API base URL (currently: https://tavusapi.com/v2)`);
    console.log(`   3. Firewall/proxy blocking the connection`);
    console.log(`   4. Tavus API might be down`);
    console.log(`\n   However, your API key is loaded correctly!`);
    console.log(`   You can proceed to test with a specific replica ID if you have one.`);
  }

  // Test 4: If a replica ID is provided, test getting replica info
  const replicaId = process.argv[2];
  if (replicaId) {
    console.log(`\n4️⃣  Testing getReplica with ID: ${replicaId}...`);
    try {
      const replica = await client.getReplica(replicaId);
      console.log("✅ Successfully retrieved replica info!");
      console.log("   Replica data:", JSON.stringify(replica, null, 2).substring(0, 300));
    } catch (error: any) {
      console.log(`❌ Failed to get replica: ${error.message}`);
    }
  } else {
    console.log("\n4️⃣  Skipping replica test (no replica ID provided)");
    console.log("   To test with a replica, run: tsx scripts/testTavus.ts <replica-id>");
  }

  console.log("\n✅ Tavus API test complete!");
  console.log("\nNext steps:");
  console.log("1. If all tests passed, proceed to Step 3: Configure companies");
  console.log("2. Add tavusReplicaId to your company records");
  console.log("3. Enable useTavusVideo or useTavusKB in the database");
}

main().catch((error) => {
  console.error("\n❌ Test failed with error:", error);
  process.exit(1);
});

