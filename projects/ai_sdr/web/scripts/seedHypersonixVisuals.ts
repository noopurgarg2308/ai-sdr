import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { prisma } from "../src/lib/prisma";
import { addMediaAsset } from "../src/lib/media";

async function main() {
  console.log("🎨 Seeding Hypersonix visual assets...");

  // Look up the company with slug = "hypersonix"
  const company = await prisma.company.findUnique({
    where: { slug: "hypersonix" },
  });

  if (!company) {
    console.error('❌ Error: Company with slug "hypersonix" not found.');
    console.error('   Please create the company first via the admin interface.');
    process.exit(1);
  }

  console.log(`✓ Found company: ${company.displayName} (${company.id})`);

  // Sample visual assets
  const visualAssets = [
    // Product Screenshots
    {
      type: "image" as const,
      url: "https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=Hypersonix+Dashboard",
      title: "Hypersonix Dashboard Overview",
      description: "Main dashboard showing real-time revenue intelligence and analytics",
      category: "product" as const,
      tags: ["dashboard", "overview", "analytics", "ui"],
    },
    {
      type: "image" as const,
      url: "https://via.placeholder.com/800x600/10B981/FFFFFF?text=Price+Optimization+Module",
      title: "Dynamic Pricing Module",
      description: "AI-powered pricing recommendations with competitor analysis",
      category: "feature" as const,
      tags: ["pricing", "optimization", "ai", "recommendations"],
    },
    {
      type: "image" as const,
      url: "https://via.placeholder.com/800x600/F59E0B/FFFFFF?text=Demand+Forecasting",
      title: "Demand Forecasting Dashboard",
      description: "Predictive analytics for inventory and demand planning",
      category: "feature" as const,
      tags: ["forecasting", "demand", "inventory", "predictions"],
    },
    
    // Pricing Charts
    {
      type: "chart" as const,
      url: "https://via.placeholder.com/600x400/3B82F6/FFFFFF?text=Pricing+Plans+Comparison",
      title: "Pricing Plans Comparison",
      description: "Compare our Starter, Pro, and Enterprise plans side-by-side",
      category: "pricing" as const,
      tags: ["pricing", "plans", "comparison", "features"],
    },
    {
      type: "chart" as const,
      url: "https://via.placeholder.com/600x400/8B5CF6/FFFFFF?text=ROI+Calculator",
      title: "ROI Impact Chart",
      description: "Average revenue increase and cost savings across customers",
      category: "case-study" as const,
      tags: ["roi", "value", "savings", "revenue"],
    },
    
    // Comparison Charts
    {
      type: "chart" as const,
      url: "https://via.placeholder.com/800x500/EC4899/FFFFFF?text=Hypersonix+vs+Competitors",
      title: "Feature Comparison Matrix",
      description: "How Hypersonix compares to traditional BI and analytics tools",
      category: "comparison" as const,
      tags: ["comparison", "competitors", "features", "matrix"],
    },
    
    // Architecture Diagram
    {
      type: "image" as const,
      url: "https://via.placeholder.com/900x600/6366F1/FFFFFF?text=System+Architecture",
      title: "Hypersonix Platform Architecture",
      description: "Cloud-native architecture with real-time data processing",
      category: "architecture" as const,
      tags: ["architecture", "technical", "cloud", "infrastructure"],
    },
    
    // Use Case Illustrations
    {
      type: "image" as const,
      url: "https://via.placeholder.com/700x500/14B8A6/FFFFFF?text=E-commerce+Use+Case",
      title: "E-commerce Optimization Workflow",
      description: "How Hypersonix helps e-commerce teams optimize pricing and inventory",
      category: "demo" as const,
      tags: ["ecommerce", "workflow", "use-case", "optimization"],
    },
    {
      type: "image" as const,
      url: "https://via.placeholder.com/700x500/F97316/FFFFFF?text=Retail+Analytics",
      title: "Retail Analytics Dashboard",
      description: "Multi-channel analytics for brick-and-mortar and online retailers",
      category: "demo" as const,
      tags: ["retail", "analytics", "multichannel", "dashboard"],
    },
    
    // Integration Diagram
    {
      type: "image" as const,
      url: "https://via.placeholder.com/800x600/EF4444/FFFFFF?text=Shopify+Integration",
      title: "Shopify Integration Flow",
      description: "One-click Shopify integration with real-time data sync",
      category: "product" as const,
      tags: ["shopify", "integration", "ecommerce", "sync"],
    },
    
    // Feature Screenshots
    {
      type: "image" as const,
      url: "https://via.placeholder.com/800x600/06B6D4/FFFFFF?text=Margin+Analytics",
      title: "Margin Analytics Module",
      description: "Product-level profitability tracking and margin analysis",
      category: "feature" as const,
      tags: ["margin", "profitability", "analytics", "finance"],
    },
    {
      type: "image" as const,
      url: "https://via.placeholder.com/800x600/84CC16/FFFFFF?text=Anomaly+Detection",
      title: "AI Anomaly Detection",
      description: "Automatic alerts for unusual patterns in revenue or costs",
      category: "feature" as const,
      tags: ["ai", "anomaly", "alerts", "detection"],
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

  console.log(`\n✅ Seeded ${visualAssets.length} visual assets for Hypersonix!`);
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

