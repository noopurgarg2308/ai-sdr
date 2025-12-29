/**
 * Tavus API Client
 * Handles both CVI (Conversational Video Interface) and Knowledge Base operations
 */

export interface TavusCVIOptions {
  replicaId: string;
  personaId?: string;
  knowledgeBaseId?: string;
  instructions?: string;
  tools?: any[];
  callbackUrl?: string; // URL for Tavus to call when tools are needed
  onVideoFrame?: (frame: Blob) => void;
  onTranscript?: (text: string, role: "user" | "assistant") => void;
  onFunctionCall?: (name: string, args: any) => Promise<any>;
  onError?: (error: Error) => void;
}

export interface TavusKnowledgeBaseResult {
  content: string;
  score: number;
  source?: string;
  documentId?: string;
}

export class TavusClient {
  private apiKey: string;
  private baseUrl = "https://tavusapi.com/v2";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      "x-api-key": this.apiKey,
      "Content-Type": "application/json",
    };
  }

  /**
   * Search Tavus Knowledge Base
   * 
   * IMPORTANT: Tavus Knowledge Base doesn't have a direct search/query endpoint.
   * Documents are attached to conversations via document_ids, and the AI persona
   * uses them automatically during conversations.
   * 
   * This method attempts to:
   * 1. List available documents for the replica
   * 2. Return document metadata (name, description) as search results
   * 3. For actual content search, documents must be attached to CVI conversations
   * 
   * For true search functionality, use your RAG system or attach documents
   * to conversations and let the Tavus persona use them contextually.
   */
  async searchKnowledgeBase(
    replicaId: string,
    query: string,
    options?: {
      limit?: number;
      knowledgeBaseId?: string;
      documentIds?: string[]; // Optional: specific document IDs to search
    }
  ): Promise<TavusKnowledgeBaseResult[]> {
    try {
      // First, try to list documents available for this replica
      const documents = await this.listDocuments({ 
        replicaId,
      });

      // If we have specific document IDs, filter to those
      let relevantDocs = documents;
      if (options?.documentIds && options.documentIds.length > 0) {
        relevantDocs = documents.filter((doc: any) => 
          options.documentIds!.includes(doc.document_id || doc.id)
        );
      }

      // If no documents found, return empty (graceful fallback)
      if (relevantDocs.length === 0) {
        console.log(
          `[Tavus] No documents found for replica ${replicaId}. ` +
          `Upload documents via POST /v2/documents to enable Knowledge Base.`
        );
        return [];
      }

      // Return document metadata as search results
      // Note: This is metadata only - actual content search happens during conversations
      const limit = options?.limit || 5;
      return relevantDocs.slice(0, limit).map((doc: any) => ({
        content: doc.document_name || doc.name || `Document: ${doc.document_id || doc.id}`,
        score: 0.7, // Default score since we can't actually search content
        source: "tavus",
        documentId: doc.document_id || doc.id,
      }));
    } catch (error) {
      console.error("[Tavus] Knowledge base search error:", error);
      // Return empty array instead of throwing - allows graceful fallback to RAG
      return [];
    }
  }

  /**
   * Create a CVI session (conversation)
   */
  async createCVISession(options: TavusCVIOptions): Promise<{
    sessionId: string;
    websocketUrl: string;
  }> {
    try {
      // Tavus uses /conversations endpoint, not /cvi/sessions
      // Build request body with optional fields
      const requestBody: any = {
        replica_id: options.replicaId,
        conversation_name: `CVI Session ${Date.now()}`,
      };

      if (options.personaId) {
        requestBody.persona_id = options.personaId;
      }

      // Add callback URL for function calls
      // This allows Tavus to call back to our API when tools are needed
      if (options.callbackUrl) {
        requestBody.callback_url = options.callbackUrl;
      } else if (typeof window === "undefined") {
        // Server-side: construct callback URL if not provided
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001");
        requestBody.callback_url = `${baseUrl}/api/tavus/callback`;
      }

      // Add instructions if provided (might be used for system prompt)
      if (options.instructions) {
        requestBody.instructions = options.instructions;
      }

      // Tools might need to be configured via persona, but let's try including them
      if (options.tools && options.tools.length > 0) {
        requestBody.tools = options.tools;
      }

      console.log("[Tavus] Creating conversation with:", {
        replica_id: requestBody.replica_id,
        has_persona: !!requestBody.persona_id,
        has_callback: !!requestBody.callback_url,
        has_instructions: !!requestBody.instructions,
        has_tools: !!requestBody.tools,
        tool_count: requestBody.tools?.length || 0,
      });

      const response = await fetch(`${this.baseUrl}/conversations`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Tavus] CVI session error: ${response.status} ${errorText}`);
        throw new Error(`Tavus API error: ${response.status}`);
      }

      const data = await response.json();

      // Tavus returns conversation_id and conversation_url (WebSocket URL)
      return {
        sessionId: data.conversation_id || data.session_id || data.id,
        websocketUrl: data.conversation_url || data.websocket_url || data.ws_url || data.url,
      };
    } catch (error) {
      console.error("[Tavus] CVI session creation error:", error);
      throw error;
    }
  }

  /**
   * Get replica information
   */
  async getReplica(replicaId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/replicas/${replicaId}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Tavus API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[Tavus] Get replica error:", error);
      throw error;
    }
  }

  /**
   * List knowledge bases for a replica
   */
  async listKnowledgeBases(replicaId: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/replicas/${replicaId}/knowledge`,
        {
          method: "GET",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Tavus API error: ${response.status}`);
      }

      const data = await response.json();
      return data.knowledge_bases || data.data || [];
    } catch (error) {
      console.error("[Tavus] List knowledge bases error:", error);
      throw error;
    }
  }

  /**
   * List documents available for a replica
   * Documents can be attached to conversations via document_ids
   */
  async listDocuments(options?: {
    replicaId?: string;
    tags?: string[];
  }): Promise<any[]> {
    try {
      const url = new URL(`${this.baseUrl}/documents`);
      if (options?.replicaId) {
        url.searchParams.append("replica_id", options.replicaId);
      }
      if (options?.tags && options.tags.length > 0) {
        url.searchParams.append("tags", options.tags.join(","));
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        // If endpoint doesn't exist, return empty array
        if (response.status === 404) {
          console.warn("[Tavus] Documents list endpoint not available");
          return [];
        }
        throw new Error(`Tavus API error: ${response.status}`);
      }

      const data = await response.json();
      // Handle Tavus API response format: { data: [], total_count: 0, page: 0, limit: 10 }
      return data.data || data.documents || [];
    } catch (error) {
      console.error("[Tavus] List documents error:", error);
      return [];
    }
  }

  /**
   * Get a specific document by ID
   */
  async getDocument(documentId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Tavus API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[Tavus] Get document error:", error);
      throw error;
    }
  }
}

/**
 * Singleton Tavus client instance
 */
let tavusClient: TavusClient | null = null;

export function getTavusClient(): TavusClient | null {
  const apiKey = process.env.TAVUS_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!tavusClient) {
    tavusClient = new TavusClient(apiKey);
  }

  return tavusClient;
}

