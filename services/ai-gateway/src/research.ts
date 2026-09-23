export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
}

export interface ResearchResult {
  query: string;
  sources: ResearchSource[];
  summary: string;
}

export interface ResearchProvider {
  search(query: string, limit: number): Promise<ResearchSource[]>;
}

export async function research(
  query: string,
  provider: ResearchProvider,
  limit = 5
): Promise<ResearchResult> {
  if (!query.trim()) throw new Error("Research query is required");

  const sources = await provider.search(query.trim(), Math.min(Math.max(limit, 1), 10));

  return {
    query: query.trim(),
    sources,
    summary: sources.length
      ? sources.map((source, index) => `${index + 1}. ${source.title}: ${source.snippet}`).join("\n")
      : "No sources found."
  };
}
