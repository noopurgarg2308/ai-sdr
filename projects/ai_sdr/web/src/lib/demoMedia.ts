import { prisma } from "./prisma";
import type { CompanyId, Persona } from "@/types/chat";

export interface DemoClip {
  url: string;
  title: string;
  persona?: Persona;
  intentTags: string[];
}

export async function getDemoClip(
  companyId: CompanyId,
  persona: Persona,
  intent: string
): Promise<DemoClip | null> {
  // Query the DemoClip table via Prisma
  // Note: intentTags is String? (not String[]) in SQLite schema
  const allClips = await prisma.demoClip.findMany({
    where: { companyId },
  });

  if (allClips.length === 0) {
    return null;
  }

  // Filter by intent (check if intentTags string contains the intent)
  let matchingClips = allClips.filter((clip) => {
    if (!clip.intentTags) return false;
    // intentTags might be comma-separated or JSON string
    const tagsLower = clip.intentTags.toLowerCase();
    return tagsLower.includes(intent.toLowerCase());
  });

  // If no intent match, return any clip
  if (matchingClips.length === 0) {
    matchingClips = allClips;
  }

  // Prefer persona match
  const personaMatch = matchingClips.find((c) => c.persona === persona);
  const selectedClip = personaMatch || matchingClips[0];

  return {
    url: selectedClip.url,
    title: selectedClip.title,
    persona: selectedClip.persona as Persona | undefined,
    intentTags: selectedClip.intentTags ? [selectedClip.intentTags] : [],
  };
}

