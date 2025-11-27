import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { prisma } from "../src/lib/prisma";
import { addMediaAsset } from "../src/lib/media";

async function main() {
  console.log("🎨 Seeding Hypersonix visual assets with working images...");

  // Look up the company with slug = "hypersonix"
  const company = await prisma.company.findUnique({
    where: { slug: "hypersonix" },
  });

  if (!company) {
    console.error('❌ Error: Company with slug "hypersonix" not found.');
    process.exit(1);
  }

  console.log(`✓ Found company: ${company.displayName} (${company.id})`);

  // Delete old placeholder assets
  await prisma.mediaAsset.deleteMany({
    where: { companyId: company.id },
  });
  console.log("✓ Cleared old placeholder assets");

  // Use picsum.photos for reliable placeholder images
  const visualAssets = [
    // Product Screenshots
    {
      type: "image" as const,
      url: "https://picsum.photos/800/600?random=1",
      title: "Hypersonix Dashboard Overview",
      description: "Main dashboard showing real-time revenue intelligence and analytics",
      category: "product" as const,
      tags: ["dashboard", "overview", "analytics", "ui", "product", "platform", "interface", "main"],
    },
    {
      type: "image" as const,
      url: "https://picsum.photos/800/600?random=2",
      title: "Dynamic Pricing Module",
      description: "AI-powered pricing recommendations with competitor analysis",
      category: "feature" as const,
      tags: ["pricing", "optimization", "ai", "recommendations", "price", "dynamic", "module", "feature"],
    },
    {
      type: "image" as const,
      url: "https://picsum.photos/800/600?random=3",
      title: "Demand Forecasting Dashboard",
      description: "Predictive analytics for inventory and demand planning",
      category: "feature" as const,
      tags: ["forecasting", "demand", "inventory", "predictions", "forecast", "planning", "analytics"],
    },
    
    // Pricing Charts
    {
      type: "chart" as const,
      url: "https://picsum.photos/600/400?random=4",
      title: "Pricing Plans Comparison",
      description: "Compare our Starter, Pro, and Enterprise plans side-by-side. Pricing options and cost breakdown.",
      category: "pricing" as const,
      tags: ["pricing", "plans", "comparison", "features", "cost", "price", "packages", "tiers"],
    },
    {
      type: "chart" as const,
      url: "https://picsum.photos/600/400?random=5",
      title: "ROI Impact Chart",
      description: "Average revenue increase and cost savings across customers",
      category: "case-study" as const,
      tags: ["roi", "value", "savings", "revenue", "impact", "results"],
    },
    
    // Comparison Charts
    {
      type: "chart" as const,
      url: "https://picsum.photos/800/500?random=6",
      title: "Feature Comparison Matrix",
      description: "How Hypersonix compares to traditional BI and analytics tools",
      category: "comparison" as const,
      tags: ["comparison", "competitors", "features", "matrix"],
    },
    
    // Architecture Diagram
    {
      type: "image" as const,
      url: "https://picsum.photos/900/600?random=7",
      title: "Hypersonix Platform Architecture",
      description: "Cloud-native architecture with real-time data processing",
      category: "architecture" as const,
      tags: ["architecture", "technical", "cloud", "infrastructure"],
    },
    
    // Use Case Illustrations
    {
      type: "image" as const,
      url: "https://picsum.photos/700/500?random=8",
      title: "E-commerce Optimization Workflow",
      description: "How Hypersonix helps e-commerce teams optimize pricing and inventory",
      category: "demo" as const,
      tags: ["ecommerce", "workflow", "use-case", "optimization"],
    },
    {
      type: "image" as const,
      url: "https://picsum.photos/700/500?random=9",
      title: "Retail Analytics Dashboard",
      description: "Multi-channel analytics for brick-and-mortar and online retailers",
      category: "demo" as const,
      tags: ["retail", "analytics", "multichannel", "dashboard"],
    },
    
    // Integration Diagram
    {
      type: "image" as const,
      url: "https://picsum.photos/800/600?random=10",
      title: "Shopify Integration Flow",
      description: "One-click Shopify integration with real-time data sync",
      category: "product" as const,
      tags: ["shopify", "integration", "ecommerce", "sync"],
    },
    
    // Feature Screenshots
    {
      type: "image" as const,
      url: "https://picsum.photos/800/600?random=11",
      title: "Margin Analytics Module",
      description: "Product-level profitability tracking and margin analysis",
      category: "feature" as const,
      tags: ["margin", "profitability", "analytics", "finance"],
    },
    {
      type: "image" as const,
      url: "https://picsum.photos/800/600?random=12",
      title: "AI Anomaly Detection",
      description: "Automatic alerts for unusual patterns in revenue or costs",
      category: "feature" as const,
      tags: ["ai", "anomaly", "alerts", "detection"],
    },

    // Sample Videos (using Big Buck Bunny - open source test video)
    {
      type: "video" as const,
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      title: "Hypersonix Product Overview",
      description: "5-minute overview of the Hypersonix platform and key features",
      category: "demo" as const,
      tags: ["video", "demo", "overview", "product", "introduction", "platform", "features"],
      thumbnail: "https://picsum.photos/400/300?random=13",
      metadata: { duration: 596, width: 1920, height: 1080 },
    },
    {
      type: "video" as const,
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      title: "Pricing Optimization Demo",
      description: "See how dynamic pricing works in real-time with live data",
      category: "demo" as const,
      tags: ["video", "demo", "pricing", "optimization", "dynamic", "tutorial"],
      thumbnail: "https://picsum.photos/400/300?random=14",
      metadata: { duration: 653, width: 1920, height: 1080 },
    },
    {
      type: "video" as const,
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      title: "Demand Forecasting Walkthrough",
      description: "Step-by-step guide to setting up and using demand forecasting",
      category: "demo" as const,
      tags: ["video", "demo", "forecasting", "demand", "tutorial", "walkthrough", "guide"],
      thumbnail: "https://picsum.photos/400/300?random=15",
      metadata: { duration: 15, width: 1920, height: 1080 },
    },
  ];

  // Insert all visual assets
  for (const asset of visualAssets) {
    try {
      await addMediaAsset({
        companyId: company.id,
        ...asset,
      });
      console.log(`✓ Added: ${asset.title}`);
    } catch (error) {
      console.error(`✗ Error adding ${asset.title}:`, error);
    }
  }

  console.log(`\n✅ Seeded ${visualAssets.length} visual assets with working images!`);
  console.log("\nNow try asking:");
  console.log('  "Show me the dashboard"');
  console.log('  "Can you show me pricing information?"');
  console.log('  "Show me how Shopify integration works"');
  console.log('  "Display the architecture diagram"');
}

main()
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

