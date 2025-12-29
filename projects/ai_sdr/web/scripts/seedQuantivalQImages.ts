import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { addMediaAsset } from "../src/lib/media";
import { processImageAsset } from "../src/lib/imageProcessor";

async function main() {
  console.log("🎨 Seeding QuantivalQ visual assets...");

  // Look up the company with slug = "quantivalq"
  const company = await prisma.company.findUnique({
    where: { slug: "quantivalq" },
  });

  if (!company) {
    console.error('❌ Error: Company with slug "quantivalq" not found.');
    console.error('   Please create the company first by running: npm run create:quantivalq');
    process.exit(1);
  }

  console.log(`✓ Found company: ${company.displayName} (${company.id})`);

  // Sample visual assets for QuantivalQ
  // Note: These use placeholder URLs. Replace with actual image URLs or local file paths
  const visualAssets = [
    // Product Screenshots
    {
      type: "image" as const,
      url: "https://via.placeholder.com/1200x800/6366F1/FFFFFF?text=QuantivalQ+Dashboard",
      title: "QuantivalQ Analytics Dashboard",
      description: "Main dashboard showing real-time analytics, model performance, and data insights",
      category: "product" as const,
      tags: ["dashboard", "analytics", "overview", "ui"],
    },
    {
      type: "image" as const,
      url: "https://via.placeholder.com/1200x800/8B5CF6/FFFFFF?text=ML+Model+Training+Interface",
      title: "Machine Learning Model Training",
      description: "Interface for training and deploying machine learning models with hyperparameter tuning",
      category: "feature" as const,
      tags: ["ml", "training", "models", "ai"],
    },
    {
      type: "image" as const,
      url: "https://via.placeholder.com/1200x800/EC4899/FFFFFF?text=Statistical+Analysis+Tools",
      title: "Statistical Analysis Module",
      description: "Advanced statistical analysis tools including regression, hypothesis testing, and time series",
      category: "feature" as const,
      tags: ["statistics", "analysis", "regression", "hypothesis"],
    },
    
    // Charts and Visualizations
    {
      type: "chart" as const,
      url: "https://via.placeholder.com/1000x600/3B82F6/FFFFFF?text=Pricing+Plans+Comparison",
      title: "QuantivalQ Pricing Plans",
      description: "Compare Starter, Professional, and Enterprise plans with feature breakdown",
      category: "pricing" as const,
      tags: ["pricing", "plans", "comparison", "features"],
    },
    {
      type: "chart" as const,
      url: "https://via.placeholder.com/1000x600/10B981/FFFFFF?text=Model+Performance+Metrics",
      title: "Model Performance Dashboard",
      description: "Visualization of model accuracy, precision, recall, and other performance metrics",
      category: "product" as const,
      tags: ["metrics", "performance", "accuracy", "evaluation"],
    },
    {
      type: "chart" as const,
      url: "https://via.placeholder.com/1000x600/F59E0B/FFFFFF?text=Time+Series+Forecasting",
      title: "Time Series Forecasting Results",
      description: "Predictive forecasting visualization with confidence intervals and trend analysis",
      category: "feature" as const,
      tags: ["forecasting", "time-series", "predictions", "trends"],
    },
    
    // Architecture and Technical
    {
      type: "image" as const,
      url: "https://via.placeholder.com/1400x900/6366F1/FFFFFF?text=System+Architecture+Diagram",
      title: "QuantivalQ Platform Architecture",
      description: "Cloud-native architecture with microservices, data processing pipeline, and ML infrastructure",
      category: "architecture" as const,
      tags: ["architecture", "technical", "cloud", "infrastructure"],
    },
    {
      type: "image" as const,
      url: "https://via.placeholder.com/1200x800/14B8A6/FFFFFF?text=API+Integration+Flow",
      title: "API Integration Workflow",
      description: "How to integrate QuantivalQ API with your existing systems and applications",
      category: "product" as const,
      tags: ["api", "integration", "workflow", "technical"],
    },
    
    // Use Cases and Demos
    {
      type: "image" as const,
      url: "https://via.placeholder.com/1200x800/EF4444/FFFFFF?text=Financial+Risk+Analysis",
      title: "Financial Risk Analysis Dashboard",
      description: "Credit risk modeling and portfolio optimization for financial services",
      category: "demo" as const,
      tags: ["finance", "risk", "portfolio", "credit"],
    },
    {
      type: "image" as const,
      url: "https://via.placeholder.com/1200x800/06B6D4/FFFFFF?text=Demand+Forecasting+Example",
      title: "E-commerce Demand Forecasting",
      description: "Predictive analytics for inventory management and demand planning",
      category: "demo" as const,
      tags: ["ecommerce", "forecasting", "inventory", "demand"],
    },
    
    // Feature Screenshots
    {
      type: "image" as const,
      url: "https://via.placeholder.com/1200x800/84CC16/FFFFFF?text=Anomaly+Detection+Module",
      title: "Anomaly Detection System",
      description: "AI-powered anomaly detection with real-time alerts and pattern recognition",
      category: "feature" as const,
      tags: ["anomaly", "detection", "alerts", "ai"],
    },
    {
      type: "image" as const,
      url: "https://via.placeholder.com/1200x800/8B5CF6/FFFFFF?text=Data+Visualization+Tools",
      title: "Advanced Data Visualization",
      description: "Interactive charts, graphs, and visualizations for data exploration and insights",
      category: "feature" as const,
      tags: ["visualization", "charts", "graphs", "exploration"],
    },
  ];

  // Insert all visual assets
  let successCount = 0;
  let errorCount = 0;
  const assetsToProcess: string[] = [];

  for (const asset of visualAssets) {
    try {
      const createdAsset = await addMediaAsset({
        companyId: company.id,
        ...asset,
      });
      console.log(`✓ Added: ${asset.title} (${createdAsset.id})`);
      successCount++;
      assetsToProcess.push(createdAsset.id);
    } catch (error) {
      console.error(`✗ Error adding ${asset.title}:`, error);
      errorCount++;
    }
  }

  console.log(`\n✅ Seeded ${successCount} visual assets for QuantivalQ!`);
  if (errorCount > 0) {
    console.log(`   Failed: ${errorCount} assets`);
  }

  // Process images with OCR
  if (assetsToProcess.length > 0) {
    console.log(`\n🔍 Processing images with OCR...`);
    let processedCount = 0;
    let failedCount = 0;

    for (const assetId of assetsToProcess) {
      try {
        const result = await processImageAsset(assetId);
        console.log(`✓ Processed: ${assetId} -> Document ${result.documentId}`);
        processedCount++;
      } catch (error) {
        console.error(`✗ Failed to process ${assetId}:`, error);
        failedCount++;
      }
    }

    console.log(`\n✅ OCR Processing complete!`);
    console.log(`   Processed: ${processedCount} images`);
    if (failedCount > 0) {
      console.log(`   Failed: ${failedCount} images`);
    }
  }

  console.log(`\n📝 Next steps:`);
  console.log(`   1. Test RAG at: http://localhost:3000/widget/quantivalq`);
  console.log(`   2. Try asking:`);
  console.log(`      - "Show me the dashboard"`);
  console.log(`      - "What are the pricing plans?"`);
  console.log(`      - "Tell me about the API"`);
  console.log(`      - "Show me the architecture diagram"`);
}

main()
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
