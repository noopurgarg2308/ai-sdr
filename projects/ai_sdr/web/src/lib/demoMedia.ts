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
  const clips = await prisma.demoClip.findMany({
    where: {
      companyId,
      intentTags: {
        has: intent,
      },
    },
  });

  if (clips.length === 0) {
    // Try without intent filter
    const allClips = await prisma.demoClip.findMany({
      where: { companyId },
    });
    
    if (allClips.length === 0) {
      return null;
    }
    
    // Return first clip as fallback
    const clip = allClips[0];
    return {
      url: clip.url,
      title: clip.title,
      persona: clip.persona as Persona | undefined,
      intentTags: clip.intentTags,
    };
  }

  // Prefer persona match
  const personaMatch = clips.find((c) => c.persona === persona);
  const selectedClip = personaMatch || clips[0];

  return {
    url: selectedClip.url,
    title: selectedClip.title,
    persona: selectedClip.persona as Persona | undefined,
    intentTags: selectedClip.intentTags,
  };
}

