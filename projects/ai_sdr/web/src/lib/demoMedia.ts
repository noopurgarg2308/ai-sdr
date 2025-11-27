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
  console.log(`[DemoMedia] Searching for demo clip: company=${companyId}, persona=${persona}, intent=${intent}`);
  
  // First, try the DemoClip table
  const allClips = await prisma.demoClip.findMany({
    where: { companyId },
  });

  if (allClips.length > 0) {
    // Filter by intent (check if intentTags string contains the intent)
    let matchingClips = allClips.filter((clip) => {
      if (!clip.intentTags) return false;
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

    console.log(`[DemoMedia] Found clip from DemoClip table: ${selectedClip.title}`);
    return {
      url: selectedClip.url,
      title: selectedClip.title,
      persona: selectedClip.persona as Persona | undefined,
      intentTags: selectedClip.intentTags ? [selectedClip.intentTags] : [],
    };
  }

  // Fallback: Search MediaAsset table for videos
  console.log(`[DemoMedia] No DemoClips found, searching MediaAsset table for videos`);
  const videoAssets = await prisma.mediaAsset.findMany({
    where: {
      companyId,
      type: "video",
    },
    take: 5,
  });

  if (videoAssets.length === 0) {
    console.log(`[DemoMedia] No videos found in MediaAsset table either`);
    return null;
  }

  // Return first video as demo
  const video = videoAssets[0];
  console.log(`[DemoMedia] Found video from MediaAsset table: ${video.title}`);
  
  return {
    url: video.url,
    title: video.title,
    persona: undefined,
    intentTags: video.tags ? JSON.parse(video.tags) : [],
  };
}

