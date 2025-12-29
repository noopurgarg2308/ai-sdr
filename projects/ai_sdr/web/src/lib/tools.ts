import type { CompanyId, Persona } from "@/types/chat";
import { searchKnowledge } from "./rag";
import { intelligentSearch } from "./smartSearch";
import { hybridSearch } from "./hybridSearch";
import { getDemoClip } from "./demoMedia";
import { createMeetingLink } from "./scheduling";
import { logLeadToCRM, type LeadPayload } from "./crm";
import { searchMediaAssets, type MediaType, type MediaCategory } from "./media";

// Export tool definitions from separate file to avoid client-side imports
export { toolDefinitions } from "./toolDefinitions";

// Keep the old definitions here for reference but commented out
const _toolDefinitionsOld = [
  {
    type: "function" as const,
    function: {
      name: "search_knowledge",
      description:
        "Search company-specific documentation, FAQs, and product information using semantic search. Use this when you need accurate information to answer a question about the company's products or services.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Natural language question to search company knowledge for.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_demo_clip",
      description:
        "Retrieve a relevant product demo video clip based on the visitor's persona and intent. Use this when the conversation has progressed to showing a demo.",
      parameters: {
        type: "object",
        properties: {
          persona: {
            type: "string",
            enum: ["vp_ecommerce", "pricing_manager", "cfo", "other"],
            description: "The visitor's role/persona",
          },
          intent: {
            type: "string",
            description: "The visitor's primary intent or use case (e.g., 'pricing_optimization', 'competitor_intelligence')",
          },
        },
        required: ["persona", "intent"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_meeting_link",
      description:
        "Generate a meeting booking link for a qualified lead who wants to speak with the sales team. Use this when the visitor is ready to book a demo or discovery call.",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description: "The visitor's timezone (e.g., 'America/New_York')",
            default: "America/New_York",
          },
          persona: {
            type: "string",
            description: "The visitor's role/persona to customize the meeting",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "log_lead",
      description:
        "Log a qualified lead to the CRM system. Use this when you've gathered enough information about a promising lead (name, email, company, role, etc.).",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The lead's full name",
          },
          email: {
            type: "string",
            description: "The lead's email address",
          },
          company: {
            type: "string",
            description: "The lead's company name",
          },
          role: {
            type: "string",
            description: "The lead's job title or role",
          },
          icp_fit: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "Ideal Customer Profile fit assessment",
          },
          use_cases: {
            type: "array",
            items: { type: "string" },
            description: "List of use cases or pain points discussed",
          },
          summary: {
            type: "string",
            description: "Brief summary of the conversation and lead qualification",
          },
        },
        required: ["email", "summary"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "show_visual",
      description:
        "Show relevant visual content (images, charts, slides, videos) to help explain a concept or answer a question. Use this when a visual would make the explanation clearer or more engaging. Examples: pricing charts, product screenshots, architecture diagrams, comparison tables, feature illustrations.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "What to search for (e.g., 'pricing', 'architecture', 'feature comparison')",
          },
          type: {
            type: "string",
            enum: ["image", "video", "pdf", "slide", "chart", "gif"],
            description: "Type of visual content to show",
          },
          category: {
            type: "string",
            enum: ["product", "pricing", "comparison", "demo", "case-study", "feature", "architecture"],
            description: "Category of content",
          },
        },
        required: ["query"],
      },
    },
  },
]; // End of old definitions (kept for reference)

export async function dispatchToolCall(
  companyId: CompanyId,
  name: string,
  args: any
): Promise<any> {
  console.log(`[Tools] Dispatching tool call: ${name}`, args);

  switch (name) {
    case "search_knowledge": {
      // Use hybrid search that combines Tavus KB + Your Multimodal RAG
      const hybridResults = await hybridSearch(companyId, args.query, {
        limit: 5,
        preferFast: false, // Always search both for comprehensive results
      });
      
      console.log(
        `[Tools] Hybrid search found ${hybridResults.results.length} results ` +
        `(Tavus: ${hybridResults.metadata.tavusResults}, ` +
        `RAG: ${hybridResults.metadata.ragResults}) ` +
        `in ${hybridResults.metadata.latency}ms using ${hybridResults.metadata.strategy} strategy`
      );
      
      // Extract media asset IDs from search results
      // IMPORTANT: Only use top 2 results for slides to avoid showing too many
      const topResultsForSlides = hybridResults.results.slice(0, 2);
      const directMediaAssetIds = new Set<string>();
      
      // Track which mediaAssetIds come from top results (these are the ones we want to show)
      const topMediaAssetIds = new Set<string>();
      
      topResultsForSlides.forEach((r: any) => {
        if (r.mediaAssetId) {
          directMediaAssetIds.add(r.mediaAssetId);
          topMediaAssetIds.add(r.mediaAssetId);
        }
      });
      
      // Also collect from all results for debugging
      hybridResults.results.forEach((r: any) => {
        if (r.mediaAssetId) {
          directMediaAssetIds.add(r.mediaAssetId);
        }
      });
      
      console.log(`[Tools] ========== SLIDE FILTERING DEBUG ==========`);
      console.log(`[Tools] Query: "${args.query}"`);
      console.log(`[Tools] Total search results: ${hybridResults.results.length}`);
      console.log(`[Tools] Top 2 results:`, topResultsForSlides.map((r: any, idx: number) => ({ 
        index: idx,
        content: r.content.substring(0, 150), 
        score: r.score.toFixed(3), 
        mediaAssetId: r.mediaAssetId, 
        pageNumber: r.pageNumber,
        source: r.source
      })));
      console.log(`[Tools] All ${hybridResults.results.length} results with mediaAssetIds:`, hybridResults.results.map((r: any, idx: number) => ({
        index: idx,
        score: r.score.toFixed(3),
        mediaAssetId: r.mediaAssetId,
        pageNumber: r.pageNumber,
        source: r.source
      })));
      console.log(`[Tools] Extracted ${directMediaAssetIds.size} unique media asset IDs from all results:`, Array.from(directMediaAssetIds));
      console.log(`[Tools] Top ${topMediaAssetIds.size} media asset IDs from top 2 results:`, Array.from(topMediaAssetIds));
      console.log(`[Tools] Search results with pageNumbers:`, hybridResults.results.filter((r: any) => r.pageNumber).map((r: any) => ({ mediaAssetId: r.mediaAssetId, pageNumber: r.pageNumber, score: r.score.toFixed(3) })));
      console.log(`[Tools] ===========================================`);
      
      // Fetch linked media assets
      let linkedMediaAssets: any[] = [];
      
      // CRITICAL FIX: Only fetch assets from top 2 results, not all results
      // This ensures different queries show different slides
      if (topMediaAssetIds.size > 0) {
        console.log(`[Tools] Fetching assets ONLY from top 2 results:`, Array.from(topMediaAssetIds));
        
        const assets = await prisma.mediaAsset.findMany({
          where: {
            id: { in: Array.from(topMediaAssetIds) }, // ONLY fetch from top 2 results
            companyId,
          },
          select: {
            id: true,
            type: true,
            url: true,
            title: true,
            description: true,
            thumbnail: true,
            metadata: true,
          },
        });
        
        console.log(`[Tools] Fetched ${assets.length} media assets from database (only from top 2 results)`);
        
        // Separate PDFs from other assets (slides, images, etc.)
        const pdfAssets = assets.filter(a => a.type === "pdf");
        const otherAssets = assets.filter(a => a.type !== "pdf");
        
        console.log(`[Tools] Assets breakdown: ${pdfAssets.length} PDFs, ${otherAssets.length} other (slides/images)`);
        
        // These assets are already filtered to top 2 results, so we can use them directly
        const topOtherAssets = otherAssets; // Already filtered by the query above
        
        console.log(`[Tools] Filtered to ${topOtherAssets.length} assets from top 2 search results (out of ${otherAssets.length} total)`);
        
        // For PDFs: If any top results point to PDFs, we need to resolve to slides
        // But rag.ts should have already resolved them, so this should be rare
        const topPdfAssets = pdfAssets.filter(pdf => topMediaAssetIds.has(pdf.id));
        if (topPdfAssets.length > 0) {
          console.log(`[Tools] WARNING: Found ${topPdfAssets.length} PDF(s) in top results - rag.ts should have resolved these to slides`);
          // Try to find slides for these PDFs using pageNumbers from top results
          const pdfToPageNumbers = new Map<string, Set<number>>();
          topResultsForSlides.forEach((r: any) => {
            if (r.mediaAssetId && r.pageNumber && topPdfAssets.some(p => p.id === r.mediaAssetId)) {
              const pageSet = pdfToPageNumbers.get(r.mediaAssetId) || new Set();
              pageSet.add(r.pageNumber);
              pdfToPageNumbers.set(r.mediaAssetId, pageSet);
            }
          });
          
          if (pdfToPageNumbers.size > 0) {
            const pdfIdsSet = new Set(topPdfAssets.map(p => p.id));
            const allSlides = await prisma.mediaAsset.findMany({
              where: {
                companyId,
                type: "slide",
              },
              select: {
                id: true,
                type: true,
                url: true,
                title: true,
                description: true,
                thumbnail: true,
                metadata: true,
              },
              take: 1000,
            });
            
            const relevantSlides = allSlides.filter(slide => {
              if (!slide.metadata) return false;
              try {
                const slideMetadata = JSON.parse(slide.metadata as string);
                const parentPdfId = slideMetadata.parentPdfId;
                const pageNumber = slideMetadata.pageNumber;
                
                if (parentPdfId && pdfIdsSet.has(parentPdfId) && pageNumber) {
                  const pageSet = pdfToPageNumbers.get(parentPdfId);
                  return pageSet && pageSet.has(pageNumber);
                }
                return false;
              } catch {
                return false;
              }
            });
            
            console.log(`[Tools] Resolved ${relevantSlides.length} slides from ${topPdfAssets.length} PDF(s)`);
            topOtherAssets.push(...relevantSlides.slice(0, 2).map(slide => ({
              id: slide.id,
              type: slide.type,
              url: slide.url,
              title: slide.title,
              description: slide.description,
              thumbnail: slide.thumbnail,
              metadata: slide.metadata,
            })));
          }
        }
        
        // Deduplicate assets by ID (same slide might appear in multiple search results)
        const uniqueAssets = new Map<string, typeof topOtherAssets[0]>();
        topOtherAssets.forEach(asset => {
          if (!uniqueAssets.has(asset.id)) {
            uniqueAssets.set(asset.id, asset);
          }
        });
        const deduplicatedAssets = Array.from(uniqueAssets.values());
        
        console.log(`[Tools] Deduplicated ${deduplicatedAssets.length} unique assets from ${topOtherAssets.length} total (removed ${topOtherAssets.length - deduplicatedAssets.length} duplicates)`);
        
        // Add only assets from top 2 results (limit to 2 total)
        // IMPORTANT: Sort by score to ensure we get the most relevant slides
        // Match assets to their search result scores
        const assetsWithScores = deduplicatedAssets.map(asset => {
          // Find the search result that matches this asset (use highest score if multiple matches)
          const matchingResults = topResultsForSlides.filter((r: any) => r.mediaAssetId === asset.id);
          const highestScore = matchingResults.length > 0 
            ? Math.max(...matchingResults.map((r: any) => r.score))
            : 0;
          return {
            asset,
            score: highestScore,
          };
        });
        
        // Sort by score (highest first) and take top 2
        assetsWithScores.sort((a, b) => b.score - a.score);
        const assetsToShow = assetsWithScores.slice(0, 2).map(item => item.asset);
        
        linkedMediaAssets.push(...assetsToShow.map(asset => ({
          type: asset.type,
          url: asset.url,
          title: asset.title,
          description: asset.description || undefined,
          thumbnail: asset.thumbnail || undefined,
          metadata: asset.metadata ? JSON.parse(asset.metadata as string) : undefined,
        })));
        
        console.log(`[Tools] Adding ${assetsToShow.length} assets from top search results (sorted by score):`, assetsToShow.map(a => ({ type: a.type, title: a.title, url: a.url })));
        console.log(`[Tools] Asset scores:`, assetsWithScores.map(item => ({ url: item.asset.url, score: item.score.toFixed(3) })));
        console.log(`[Tools] ========== END SLIDE FILTERING DEBUG ==========`);
        
        // Filter out PDFs - we only want to show slides/images, not PDF files
        linkedMediaAssets = linkedMediaAssets.filter(a => a.type !== "pdf");
        
        // Final limit: show at most 2 slides/images total
        if (linkedMediaAssets.length > 2) {
          linkedMediaAssets = linkedMediaAssets.slice(0, 2);
          console.log(`[Tools] Limited to top 2 visual assets total`);
        }
        
        console.log(`[Tools] Found ${linkedMediaAssets.length} linked media assets from search results (PDFs filtered out)`);
        console.log(`[Tools] Linked media assets:`, linkedMediaAssets.map(a => ({ type: a.type, title: a.title, url: a.url })));
      } else {
        console.log(`[Tools] No media asset IDs found in search results`);
      }
      
      // Also filter PDFs from hybridResults.linkedVisuals
      const filteredHybridVisuals = (hybridResults.linkedVisuals || []).filter((v: any) => v.type !== "pdf");
      console.log(`[Tools] hybridResults.linkedVisuals: ${hybridResults.linkedVisuals?.length || 0} (${filteredHybridVisuals.length} after filtering PDFs)`);
      
      return {
        results: hybridResults.results.map((r: any) => ({
          content: r.content,
          score: r.score,
          source: r.source, // Indicates which KB it came from
          mediaAssetId: r.mediaAssetId, // Include media asset ID if linked
          pageNumber: r.pageNumber, // Include page number if available
        })),
        linkedVisuals: [
          ...filteredHybridVisuals,
          ...linkedMediaAssets, // Add media assets linked from search results
        ],
        visualResults: hybridResults.visualResults,
        metadata: hybridResults.metadata, // Include search metadata
      };
    }

    case "get_demo_clip":
      return await getDemoClip(companyId, args.persona as Persona, args.intent);

    case "create_meeting_link":
      return await createMeetingLink(args.timezone, args.persona);

    case "log_lead": {
      const payload: LeadPayload = {
        ...args,
        companyId,
      };
      return await logLeadToCRM(payload);
    }

    case "show_visual": {
      const results = await searchMediaAssets({
        companyId,
        query: args.query,
        type: args.type as MediaType | undefined,
        category: args.category as MediaCategory | undefined,
        limit: 3,
      });
      return {
        visuals: results.map((v) => ({
          type: v.type,
          url: v.url,
          title: v.title,
          description: v.description,
          thumbnail: v.thumbnail,
        })),
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

