import type { ResearchProvider, ResearchSource } from "./research.js";

export class FirecrawlResearchProvider implements ResearchProvider {
  constructor(private readonly apiKey?: string) {}

  async search(query: string, limit: number): Promise<ResearchSource[]> {
    if (!this.apiKey) {
      throw new Error("Firecrawl API key is not configured");
    }

    const response = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query, limit })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Research provider failed (${response.status}): ${detail.slice(0, 500)}`);
    }

    const data = await response.json() as any;
    const items = Array.isArray(data?.data) ? data.data : [];

    return items.map((item: any) => ({
      title: typeof item.title === "string" ? item.title : "Untitled source",
      url: typeof item.url === "string" ? item.url : "",
      snippet: typeof item.description === "string"
        ? item.description
        : typeof item.markdown === "string"
          ? item.markdown.slice(0, 500)
          : ""
    }));
  }
}
