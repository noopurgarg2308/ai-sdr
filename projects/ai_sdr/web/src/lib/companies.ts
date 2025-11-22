import { prisma } from "./prisma";
import type { CompanyConfig } from "@/types/chat";

export async function getCompanyConfigBySlug(slug: string): Promise<CompanyConfig> {
  const company = await prisma.company.findUnique({
    where: { slug },
  });

  if (!company) {
    throw new Error(`Company with slug "${slug}" not found`);
  }

  // Merge the DB row fields with the JSON config
  const config = company.config as Partial<CompanyConfig>;

  return {
    id: company.id,
    slug: company.slug,
    displayName: company.displayName,
    shortDescription: company.shortDescription,
    websiteUrl: company.websiteUrl ?? undefined,
    personas: config.personas ?? ["vp_ecommerce", "pricing_manager", "cfo", "other"],
    ragIndexName: config.ragIndexName ?? `rag_${company.slug}`,
    demoNamespace: config.demoNamespace ?? company.slug,
    productSummary: config.productSummary ?? "",
    toneGuidelines: config.toneGuidelines,
    features: config.features ?? {
      canBookMeetings: true,
      canShowDemoClips: true,
      canLogLeads: true,
    },
    actionTemplates: config.actionTemplates,
  };
}

export async function listCompanies() {
  return await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
  });
}

