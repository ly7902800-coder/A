export interface GitHubFile {
  path: string;
  sha?: string;
  content?: string;
  type: "file" | "dir";
}

export interface GitHubAdapter {
  getFile(owner: string, repo: string, path: string, ref?: string): Promise<GitHubFile>;
  listContents(owner: string, repo: string, path?: string, ref?: string): Promise<GitHubFile[]>;
  putFile(owner: string, repo: string, path: string, content: string, message: string, branch?: string, sha?: string): Promise<unknown>;
}

export class GitHubRestAdapter implements GitHubAdapter {
  private readonly base = "https://api.github.com";
  constructor(private readonly token?: string) {}

  private async request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/vnd.github+json");
    headers.set("X-GitHub-Api-Version", "2026-03-10");
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);
    const response = await fetch(`${this.base}${path}`, { ...init, headers });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`GitHub API failed (${response.status}): ${detail.slice(0, 500)}`);
    }
    return response.json() as Promise<any>;
  }

  async getFile(owner: string, repo: string, path: string, ref?: string): Promise<GitHubFile> {
    const suffix = ref ? `?ref=${encodeURIComponent(ref)}` : "";
    const data = await this.request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.replace(/^\//, "")}${suffix}`);
    if (Array.isArray(data)) throw new Error("Path is a directory");
    return {
      path: data.path,
      sha: data.sha,
      type: data.type,
      content: typeof data.content === "string"
        ? Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8")
        : undefined
    };
  }

  async listContents(owner: string, repo: string, path = "", ref?: string): Promise<GitHubFile[]> {
    const suffix = ref ? `?ref=${encodeURIComponent(ref)}` : "";
    const data = await this.request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.replace(/^\//, "")}${suffix}`);
    const items = Array.isArray(data) ? data : [data];
    return items.map((item: any) => ({
      path: item.path,
      sha: item.sha,
      type: item.type === "dir" ? "dir" : "file"
    }));
  }

  async putFile(owner: string, repo: string, path: string, content: string, message: string, branch?: string, sha?: string) {
    if (!this.token) throw new Error("GitHub token is not configured");
    return this.request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.replace(/^\//, "")}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        content: Buffer.from(content, "utf8").toString("base64"),
        branch,
        sha
      })
    });
  }
}
