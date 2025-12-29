/**
 * Website Crawler - Extracts text and images from websites
 * 
 * This module crawls websites, extracts text content, collects images,
 * and prepares data for ingestion into the RAG system.
 * 
 * Reuses existing abstractions:
 * - Website pages → Document with source: "website_page"
 * - Website images → MediaAsset with type: "image" (reuses OCR pipeline)
 */

import * as cheerio from "cheerio";

export interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  includeImages?: boolean;
  respectRobotsTxt?: boolean;
  allowedDomains?: string[];
}

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
  headingsPath: string[]; // Breadcrumb path: ["Home", "Products", "Pricing"]
  images: CrawledImage[];
  links: string[]; // Internal links for further crawling
  depth: number;
}

export interface CrawledImage {
  url: string;
  alt: string;
  title?: string;
}

/**
 * Extract text content from HTML
 */
function extractText(html: string, baseUrl: string): {
  title: string;
  text: string;
  headingsPath: string[];
  images: CrawledImage[];
  links: string[];
} {
  const $ = cheerio.load(html);
  
  // Extract title
  const title = $("title").text().trim() || $("h1").first().text().trim() || "Untitled";
  
  // Remove script, style, and other non-content elements
  $("script, style, nav, footer, header, aside, .sidebar, .menu").remove();
  
  // Extract headings to build breadcrumb path
  const headings: string[] = [];
  $("h1, h2").each((_, el) => {
    const text = $(el).text().trim();
    if (text && !headings.includes(text)) {
      headings.push(text);
    }
  });
  
  // Use first few headings as breadcrumb (max 4 levels)
  const headingsPath = headings.slice(0, 4);
  
  // Extract main text content
  const mainContent = $("main, article, .content, .main-content, body").first();
  if (mainContent.length === 0) {
    // Fallback to body
    const bodyText = $("body").text();
    const text = bodyText
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join("\n");
    
    return {
      title,
      text: text.substring(0, 50000), // Limit text length
      headingsPath,
      images: extractImages($, baseUrl),
      links: extractLinks($, baseUrl),
    };
  }
  
  const text = mainContent
    .text()
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join("\n");
  
  return {
    title,
    text: text.substring(0, 50000), // Limit text length
    headingsPath,
    images: extractImages($, baseUrl),
    links: extractLinks($, baseUrl),
  };
}

/**
 * Extract images from HTML
 */
function extractImages($: cheerio.CheerioAPI, baseUrl: string): CrawledImage[] {
  const images: CrawledImage[] = [];
  
  $("img").each((_, el) => {
    const src = $(el).attr("src");
    const alt = $(el).attr("alt") || "";
    const title = $(el).attr("title");
    
    if (!src) return;
    
    // Resolve relative URLs
    let imageUrl = src;
    if (src.startsWith("//")) {
      imageUrl = `https:${src}`;
    } else if (src.startsWith("/")) {
      try {
        const base = new URL(baseUrl);
        imageUrl = `${base.origin}${src}`;
      } catch {
        return; // Skip invalid URLs
      }
    } else if (!src.startsWith("http")) {
      try {
        const base = new URL(baseUrl);
        imageUrl = new URL(src, baseUrl).href;
      } catch {
        return; // Skip invalid URLs
      }
    }
    
    // Filter out very small images (likely icons) and data URLs
    if (imageUrl.startsWith("data:")) return;
    
    images.push({
      url: imageUrl,
      alt,
      title,
    });
  });
  
  return images;
}

/**
 * Extract internal links from HTML
 */
function extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const links: string[] = [];
  const baseDomain = new URL(baseUrl).origin;
  
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    
    try {
      // Resolve relative URLs
      let linkUrl: string;
      if (href.startsWith("//")) {
        linkUrl = `https:${href}`;
      } else if (href.startsWith("/")) {
        linkUrl = `${baseDomain}${href}`;
      } else if (href.startsWith("http")) {
        linkUrl = href;
      } else {
        linkUrl = new URL(href, baseUrl).href;
      }
      
      // Only include links from same domain
      const linkDomain = new URL(linkUrl).origin;
      if (linkDomain === baseDomain) {
        // Remove fragments and query params for deduplication
        const cleanUrl = new URL(linkUrl);
        cleanUrl.hash = "";
        cleanUrl.search = "";
        links.push(cleanUrl.href);
      }
    } catch {
      // Skip invalid URLs
    }
  });
  
  // Deduplicate
  return Array.from(new Set(links));
}

/**
 * Crawl a single page
 */
export async function crawlPage(
  url: string,
  options: CrawlOptions = {}
): Promise<CrawledPage> {
  console.log(`[WebsiteCrawler] Crawling page: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AI-SDR-Bot/1.0; +https://example.com/bot)",
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const extracted = extractText(html, url);
    
    return {
      url,
      title: extracted.title,
      text: extracted.text,
      headingsPath: extracted.headingsPath,
      images: extracted.images,
      links: extracted.links,
      depth: 0, // Will be set by crawler
    };
  } catch (error) {
    console.error(`[WebsiteCrawler] Error crawling ${url}:`, error);
    throw error;
  }
}

/**
 * Crawl website starting from a base URL
 */
export async function crawlWebsite(
  baseUrl: string,
  options: CrawlOptions = {}
): Promise<CrawledPage[]> {
  const {
    maxPages = 50,
    maxDepth = 3,
    includeImages = true,
    allowedDomains = [],
  } = options;
  
  console.log(`[WebsiteCrawler] Starting crawl: ${baseUrl} (maxPages: ${maxPages}, maxDepth: ${maxDepth})`);
  
  const baseDomain = new URL(baseUrl).origin;
  const allowedDomainsSet = allowedDomains.length > 0 
    ? new Set(allowedDomains)
    : new Set([baseDomain]);
  
  const visited = new Set<string>();
  const pages: CrawledPage[] = [];
  const queue: Array<{ url: string; depth: number }> = [{ url: baseUrl, depth: 0 }];
  
  while (queue.length > 0 && pages.length < maxPages) {
    const { url, depth } = queue.shift()!;
    
    // Skip if already visited or too deep
    if (visited.has(url) || depth > maxDepth) {
      continue;
    }
    
    // Check domain
    try {
      const urlDomain = new URL(url).origin;
      if (!allowedDomainsSet.has(urlDomain)) {
        continue;
      }
    } catch {
      continue; // Skip invalid URLs
    }
    
    visited.add(url);
    
    try {
      const page = await crawlPage(url, options);
      page.depth = depth;
      pages.push(page);
      
      // Add links to queue for further crawling
      if (depth < maxDepth) {
        for (const link of page.links) {
          if (!visited.has(link) && pages.length < maxPages) {
            queue.push({ url: link, depth: depth + 1 });
          }
        }
      }
      
      // Small delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[WebsiteCrawler] Failed to crawl ${url}:`, error);
      // Continue with next page
    }
  }
  
  console.log(`[WebsiteCrawler] Crawl complete: ${pages.length} pages crawled`);
  return pages;
}
