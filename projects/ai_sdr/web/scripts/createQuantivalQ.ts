import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import type { CompanyConfig, Persona } from "../src/types/chat";

async function main() {
  console.log("🏢 Creating QuantivalQ company...");

  const slug = "quantivalq";
  const displayName = "QuantivalQ";
  const shortDescription = "AI-powered quantitative analytics platform";
  const websiteUrl = "https://quantivalq.com";
  const productSummary = `
QuantivalQ is an advanced AI-powered quantitative analytics platform designed for data scientists, 
financial analysts, and quantitative researchers. The platform combines machine learning with 
statistical analysis to deliver powerful insights and predictive models.
  `.trim();

  // Check if company already exists
  const existing = await prisma.company.findUnique({
    where: { slug },
  });

  if (existing) {
    console.log(`✓ Company "${displayName}" already exists with ID: ${existing.id}`);
    console.log("  Skipping creation...");
    return existing;
  }

  // Build default config
  const config: Partial<CompanyConfig> = {
    personas: ["data_scientist", "quantitative_analyst", "financial_analyst", "other"] as Persona[],
    ragIndexName: `rag_${slug}`,
    demoNamespace: slug,
    productSummary: productSummary,
    features: {
      canBookMeetings: true,
      canShowDemoClips: true,
      canLogLeads: true,
    },
  };

  // Create company
  const company = await prisma.company.create({
    data: {
      slug,
      displayName,
      shortDescription,
      websiteUrl: websiteUrl || null,
      ownerEmail: null,
      config: config as any,
    },
  });

  console.log(`✅ Created company: ${company.displayName}`);
  console.log(`   ID: ${company.id}`);
  console.log(`   Slug: ${company.slug}`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Run: npm run seed:quantivalq:docs`);
  console.log(`   2. Run: npm run seed:quantivalq:images`);
  console.log(`   3. Test RAG at: http://localhost:3000/widget/${slug}`);

  return company;
}

main()
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
