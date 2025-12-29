import { prisma } from "./prisma";
import type { CompanyId } from "@/types/chat";

export type MediaType = "image" | "video" | "pdf" | "slide" | "chart" | "gif";
export type MediaCategory = "product" | "pricing" | "comparison" | "demo" | "case-study" | "feature" | "architecture" | "company-info";

export interface MediaAsset {
  id: string;
  type: MediaType;
  url: string;
  title: string;
  description?: string;
  category?: MediaCategory;
  tags?: string[];
  thumbnail?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    pages?: number;
    fileSize?: number;
    [key: string]: any;
  };
}

/**
 * Search for relevant media assets based on query or tags
 */
export async function searchMediaAssets(options: {
  companyId: CompanyId;
  query?: string;
  type?: MediaType;
  category?: MediaCategory;
  tags?: string[];
  limit?: number;
}): Promise<MediaAsset[]> {
  const { companyId, query, type, category, tags, limit = 5 } = options;

  console.log(`[Media] Searching for assets: company=${companyId}, query="${query}", type=${type}, category=${category}`);

  // Build where clause
  const where: any = { companyId };
  
  if (type) where.type = type;
  if (category) where.category = category;

  const assets = await prisma.mediaAsset.findMany({
    where,
    take: limit * 3, // Get more to filter
    orderBy: { createdAt: "desc" },
  });

  console.log(`[Media] Found ${assets.length} assets from database`);

  // If no results and both type and category were specified, retry with just category
  if (assets.length === 0 && type && category) {
    console.log(`[Media] No assets found with type=${type} and category=${category}, retrying with just category`);
    const retryAssets = await prisma.mediaAsset.findMany({
      where: { companyId, category },
      take: limit * 3,
      orderBy: { createdAt: "desc" },
    });
    console.log(`[Media] Retry found ${retryAssets.length} assets`);
    
    if (retryAssets.length > 0) {
      // Use retry results instead
      return retryAssets.map((asset) => ({
        id: asset.id,
        type: asset.type as MediaType,
        url: asset.url,
        title: asset.title,
        description: asset.description || undefined,
        category: asset.category as MediaCategory | undefined,
        tags: asset.tags ? JSON.parse(asset.tags) : undefined,
        thumbnail: asset.thumbnail || undefined,
        metadata: asset.metadata ? JSON.parse(asset.metadata) : undefined,
      })).slice(0, limit);
    }
  }

  if (assets.length === 0) {
    console.log(`[Media] No assets found for companyId=${companyId}, type=${type}, category=${category}`);
    return [];
  }

  // Parse and filter
  let results = assets.map((asset) => ({
    id: asset.id,
    type: asset.type as MediaType,
    url: asset.url,
    title: asset.title,
    description: asset.description || undefined,
    category: asset.category as MediaCategory | undefined,
    tags: asset.tags ? JSON.parse(asset.tags) : undefined,
    thumbnail: asset.thumbnail || undefined,
    metadata: asset.metadata ? JSON.parse(asset.metadata) : undefined,
  }));

  // Filter by query if provided (use loose matching with individual words)
  if (query) {
    const queryWords = query.toLowerCase().split(/\s+/);
    results = results.filter((asset) => {
      const searchText = [
        asset.title.toLowerCase(),
        asset.description?.toLowerCase() || "",
        ...(asset.tags?.map(t => t.toLowerCase()) || []),
      ].join(" ");
      
      // Match if ANY query word is found (more lenient)
      return queryWords.some(word => searchText.includes(word));
    });
    
    console.log(`[Media] After query filter: ${results.length} results`);
  }

  // Filter by tags if provided
  if (tags && tags.length > 0) {
    results = results.filter((asset) => {
      if (!asset.tags) return false;
      return tags.some((tag) => 
        asset.tags!.some((assetTag) => 
          assetTag.toLowerCase().includes(tag.toLowerCase())
        )
      );
    });
  }

  const finalResults = results.slice(0, limit);
  console.log(`[Media] Returning ${finalResults.length} results after filtering`);
  finalResults.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.title} (${r.type})`);
  });
  
  return finalResults;
}

/**
 * Get a specific media asset by ID
 */
export async function getMediaAsset(id: string): Promise<MediaAsset | null> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
  });

  if (!asset) return null;

  return {
    id: asset.id,
    type: asset.type as MediaType,
    url: asset.url,
    title: asset.title,
    description: asset.description || undefined,
    category: asset.category as MediaCategory | undefined,
    tags: asset.tags ? JSON.parse(asset.tags) : undefined,
    thumbnail: asset.thumbnail || undefined,
    metadata: asset.metadata ? JSON.parse(asset.metadata) : undefined,
  };
}

/**
 * Add a new media asset
 */
export async function addMediaAsset(options: {
  companyId: CompanyId;
  type: MediaType;
  url: string;
  title: string;
  description?: string;
  category?: MediaCategory;
  tags?: string[];
  thumbnail?: string;
  metadata?: Record<string, any>;
}): Promise<MediaAsset> {
  const {
    companyId,
    type,
    url,
    title,
    description,
    category,
    tags,
    thumbnail,
    metadata,
  } = options;

  const asset = await prisma.mediaAsset.create({
    data: {
      companyId,
      type,
      url,
      title,
      description: description || null,
      category: category || null,
      tags: tags ? JSON.stringify(tags) : null,
      thumbnail: thumbnail || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  return {
    id: asset.id,
    type: asset.type as MediaType,
    url: asset.url,
    title: asset.title,
    description: asset.description || undefined,
    category: asset.category as MediaCategory | undefined,
    tags: asset.tags ? JSON.parse(asset.tags) : undefined,
    thumbnail: asset.thumbnail || undefined,
    metadata: asset.metadata ? JSON.parse(asset.metadata) : undefined,
  };
}

/**
 * Get media assets by category
 */
export async function getMediaByCategory(
  companyId: CompanyId,
  category: MediaCategory,
  limit: number = 10
): Promise<MediaAsset[]> {
  return searchMediaAssets({ companyId, category, limit });
}

/**
 * Get media assets by type
 */
export async function getMediaByType(
  companyId: CompanyId,
  type: MediaType,
  limit: number = 10
): Promise<MediaAsset[]> {
  return searchMediaAssets({ companyId, type, limit });
}

