import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
// Use process.cwd() to get project root, not __dirname
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import { prisma } from "../src/lib/prisma";
import { ingestCompanyDoc } from "../src/lib/rag";

async function main() {
  console.log("🌱 Seeding Hypersonix documentation...");

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

  // Prepare the content about Hypersonix
  const content = `
Hypersonix is an AI-powered autonomous revenue intelligence platform designed for retailers and brands.

Product Overview:
Hypersonix provides real-time, autonomous insights that help businesses optimize their revenue operations. The platform combines advanced AI with comprehensive analytics to deliver actionable intelligence across multiple business functions.

Key Capabilities:

1. Demand Forecasting
- AI-driven demand prediction models
- Seasonal trend analysis
- Real-time inventory optimization
- Multi-location forecasting support

2. Price and Promotion Optimization
- Dynamic pricing recommendations
- Promotional effectiveness analysis
- Competitive price monitoring
- Margin-aware pricing strategies
- A/B testing for pricing strategies

3. Margin Analytics
- Product-level profitability analysis
- Cost structure optimization
- Gross margin tracking and alerts
- Contribution margin analysis by channel

4. Revenue Intelligence
- Autonomous anomaly detection
- Revenue driver identification
- Cross-channel performance analysis
- Predictive revenue modeling

5. Shopify Integration
- Native Shopify app available
- Real-time data synchronization
- One-click setup process
- Support for Shopify Plus features

Use Cases:

E-commerce Directors & VPs:
- Optimize product mix and inventory levels
- Identify top revenue drivers and underperformers
- Make data-driven decisions on promotional calendars
- Monitor key metrics across all sales channels

Pricing Managers:
- Set optimal prices based on demand elasticity
- Analyze competitor pricing strategies
- Measure promotion ROI and effectiveness
- Automate price updates based on market conditions

CFOs & Finance Teams:
- Track profitability by product, category, and channel
- Understand margin compression factors
- Model different pricing scenarios
- Generate financial forecasts with confidence intervals

Retailers and Brands:
- Small to mid-size e-commerce businesses
- Multi-channel retailers (online + physical)
- Direct-to-consumer brands
- Shopify merchants looking to scale

Technical Features:
- Cloud-native SaaS platform
- Real-time data processing
- API access for custom integrations
- Role-based access control
- Automated reporting and alerts
- Mobile-responsive dashboard

Platform Benefits:
- Increase revenue by 5-15% through optimized pricing
- Reduce inventory costs by 10-20% with better forecasting
- Save 10+ hours per week on manual analysis
- Make faster, data-driven decisions
- Identify growth opportunities proactively

Getting Started:
Companies can start with a free trial or schedule a personalized demo. The onboarding process typically takes 2-3 days for basic setup, with full historical analysis available within a week. Our customer success team provides hands-on support during implementation.

For more information, visit our website or schedule a discovery call with our sales team.
  `.trim();

  // Ingest the document
  try {
    const document = await ingestCompanyDoc({
      companyId: company.id,
      title: "Hypersonix Platform Documentation",
      source: "seed",
      content,
    });

    console.log(`✓ Document created: ${document.id}`);
    console.log(`✓ Title: ${document.title}`);
    console.log("✅ Seeded Hypersonix docs successfully!");
  } catch (error) {
    console.error("❌ Error ingesting document:", error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

