import { executeCodingTask } from "./coding-agent.js";

function token() {
  const value = process.env.GITHUB_TOKEN;
  if (!value) throw new Error("GITHUB_TOKEN is not configured");
  return value;
}

async function gh(path: string, init: RequestInit = {}) {
  const response = await fetch("https://api.github.com" + path, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token(),
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("GitHub API " + response.status + ": " + JSON.stringify(data).slice(0, 800));
  return data;
}

const targetCommands: Record<string, string> = {
  web: "npm run build",
  apk: "cd apps/mobile && flutter build apk --release",
  aab: "cd apps/mobile && flutter build appbundle --release",
};

export function createBuildPlan(target: string) {
  if (!targetCommands[target]) throw new Error("Unsupported build target: " + target);
  return {
    target,
    command: targetCommands[target],
    artifact:
      target === "web"
        ? "dist"
        : target === "apk"
          ? "apps/mobile/build/app/outputs/flutter-apk/app-release.apk"
          : "apps/mobile/build/app/outputs/bundle/release/app-release.aab",
    approvalRequired: true,
  };
}

export async function dispatchBuild(repo: string, branch: string, target: string) {
  const plan = createBuildPlan(target);
  const dispatchedAt = new Date().toISOString();
  await gh("/repos/" + repo + "/actions/workflows/genesis-build.yml/dispatches", {
    method: "POST",
    body: JSON.stringify({ ref: branch, inputs: { target } }),
  });

  let runId: number | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    const runs = await gh("/repos/" + repo + "/actions/workflows/genesis-build.yml/runs?branch=" + encodeURIComponent(branch) + "&per_page=10");
    const run = (runs.workflow_runs ?? []).find(
      (item: any) => new Date(item.created_at).getTime() >= new Date(dispatchedAt).getTime() - 5000,
    );
    if (run) {
      runId = run.id;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return { repo, branch, ...plan, runId, dispatchedAt };
}

export async function getFlutterBuildStatus(repo: string, branch: string) {
  const runs = await gh("/repos/" + repo + "/actions/workflows/genesis-build.yml/runs?branch=" + encodeURIComponent(branch) + "&per_page=5");
  const run = (runs.workflow_runs ?? [])[0];
  if (!run) return { found: false, repo, branch };
  return { found: true, runId: run.id, status: run.status, conclusion: run.conclusion, htmlUrl: run.html_url, createdAt: run.created_at, updatedAt: run.updated_at };
}

export async function getFlutterBuildArtifacts(repo: string, runId: number) {
  const data = await gh("/repos/" + repo + "/actions/runs/" + runId + "/artifacts");
  return (data.artifacts ?? []).map((artifact: any) => ({
    id: artifact.id,
    name: artifact.name,
    size: artifact.size_in_bytes,
    expired: artifact.expired,
    createdAt: artifact.created_at,
    expiresAt: artifact.expires_at,
    downloadUrl: artifact.archive_download_url,
  }));
}

export async function runFlutterAgent(repo: string, branch: string, objective: string) {
  if (!objective?.trim()) throw new Error("objective is required");
  return executeCodingTask({ repo, base: branch, objective, createPullRequest: true, maxIterations: 5 });
}

export function uiScreenSpec(name: string, components: string[]) {
  return { name, viewport: { width: 390, height: 844 }, direction: "rtl", theme: "genesis-dark", components: components.map((component, index) => ({ id: "c" + index, type: component })) };
}

export async function seoGeoAudit(url: string) {
  const response = await fetch(url, { redirect: "follow" });
  const html = await response.text();
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const description = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] ?? "").trim();
  const canonical = (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i)?.[1] ?? "").trim();
  const h1 = (html.match(/<h1\b/gi) ?? []).length;
  return { url, status: response.status, title, description, canonical, h1, checks: { title: Boolean(title), description: Boolean(description), canonical: Boolean(canonical), singleH1: h1 === 1 }, geo: { llmsTxt: "/llms.txt", structuredData: /application\/ld\+json/i.test(html) } };
}
