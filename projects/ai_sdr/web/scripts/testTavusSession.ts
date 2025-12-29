import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const apiKey = process.env.TAVUS_API_KEY!;
const replicaId = "rfcc944ac6"; // The replica we configured

async function testEndpoints() {
  console.log("🧪 Testing Tavus CVI Session Endpoints\n");
  console.log(`Using replica ID: ${replicaId}\n`);

  // Test different possible endpoints
  const endpoints = [
    {
      url: "https://tavusapi.com/v2/cvi/sessions",
      name: "CVI Sessions",
      body: {
        replica_id: replicaId,
      },
    },
    {
      url: "https://tavusapi.com/v2/conversations",
      name: "Conversations",
      body: {
        replica_id: replicaId,
        conversation_name: "Test Session",
      },
    },
    {
      url: "https://tavusapi.com/v2/cvi/conversations",
      name: "CVI Conversations",
      body: {
        replica_id: replicaId,
      },
    },
  ];

  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint.name} (${endpoint.url})`);
    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(endpoint.body),
      });

      const responseText = await response.text();
      console.log(`   Status: ${response.status}`);

      if (response.ok) {
        console.log(`   ✅ SUCCESS!`);
        try {
          const data = JSON.parse(responseText);
          console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 300));
        } catch {
          console.log(`   Response: ${responseText.substring(0, 200)}`);
        }
        break; // Found the right endpoint
      } else {
        console.log(`   ❌ Failed: ${response.status}`);
        try {
          const error = JSON.parse(responseText);
          console.log(`   Error:`, JSON.stringify(error, null, 2).substring(0, 200));
        } catch {
          console.log(`   Error: ${responseText.substring(0, 200)}`);
        }
      }
    } catch (error: any) {
      console.log(`   ❌ Exception: ${error.message}`);
    }
    console.log();
  }
}

testEndpoints().catch(console.error);

