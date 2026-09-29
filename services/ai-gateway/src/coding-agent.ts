import { chatExtended } from "./extended-providers.js";

type Change = { path: string; content: string };

function token() {
  const value = process.env.GITHUB_TOKEN;
  if (!value) throw new Error("GITHUB_TOKEN is not configured");
  return value;
}

function headers() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + token(),
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function gh(path: string, init: RequestInit = {}) {
  const response = await fetch("https://api.github.com" + path, {
    ...init,
    headers: { ...headers(), ...(init.headers ?? {}) },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error("GitHub API " + response.status + ": " + JSON.stringify(data).slice(0, 1200));
  }
  return data;
}

async function ghText(path: string) {
  const response = await fetch("https://api.github.com" + path, {
    headers: headers(),
    redirect: "follow",
  });
  const text = await response.text();
  if (!response.ok) throw new Error("GitHub logs API " + response.status + ": " + text.slice(0, 800));
  return text;
}

export async function readRepository(repo: string, ref = "main") {
  const tree = await gh("/repos/" + repo + "/git/trees/" + encodeURIComponent(ref) + "?recursive=1");
  const files = (tree.tree ?? [])
    .filter((item: any) => item.type === "blob" && item.size <= 200000)
    .slice(0, 250);
  const out: Array<{ path: string; content: string }> = [];
  for (const file of files) {
    const data = await gh("/repos/" + repo + "/contents/" + file.path + "?ref=" + encodeURIComponent(ref));
    out.push({
      path: file.path,
      content: Buffer.from(data.content ?? "", "base64").toString("utf8"),
    });
  }
  return out;
}

async function currentSha(repo: string, path: string, ref: string) {
  const data = await gh("/repos/" + repo + "/contents/" + path + "?ref=" + encodeURIComponent(ref));
  return data.sha as string;
}

async function createBranch(repo: string, name: string, base: string) {
  const baseRef = await gh("/repos/" + repo + "/git/ref/heads/" + encodeURIComponent(base));
  await gh("/repos/" + repo + "/git/refs", {
    method: "POST",
    body: JSON.stringify({ ref: "refs/heads/" + name, sha: baseRef.object.sha }),
  });
}

async function writeFile(repo: string, path: string, content: string, branchName: string, message: string) {
  const sha = await currentSha(repo, path, branchName).catch(() => undefined);
  await gh("/repos/" + repo + "/contents/" + path, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: Buffer.from(content).toString("base64"),
      branch: branchName,
      ...(sha ? { sha } : {}),
    }),
  });
}

async function dispatchChecks(repo: string, branchName: string) {
  await gh("/repos/" + repo + "/actions/workflows/genesis-agent.yml/dispatches", {
    method: "POST",
    body: JSON.stringify({ ref: branchName, inputs: { task: "verify" } }),
  });
  return Date.now();
}

async function waitForChecks(repo: string, branchName: string, started: number, timeoutMs = 180000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const data = await gh("/repos/" + repo + "/actions/runs?branch=" + encodeURIComponent(branchName) + "&per_page=10");
    const run = (data.workflow_runs ?? []).find(
      (item: any) => item.name === "Genesis Agent Checks" && new Date(item.created_at).getTime() >= started - 5000,
    );
    if (run && run.status === "completed") {
      return { status: run.status, conclusion: run.conclusion, runId: run.id, url: run.html_url };
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  return { status: "timeout" };
}

async function checkLogs(repo: string, runId: number) {
  const jobs = await gh("/repos/" + repo + "/actions/runs/" + runId + "/jobs");
  const chunks: string[] = [];
  for (const job of (jobs.jobs ?? []).slice(0, 5)) {
    try {
      chunks.push((await ghText("/repos/" + repo + "/actions/jobs/" + job.id + "/logs")).slice(-20000));
    } catch {}
  }
  return chunks.join("\n").slice(-60000);
}

async function createPR(repo: string, branchName: string, base: string, title: string, body: string) {
  return gh("/repos/" + repo + "/pulls", {
    method: "POST",
    body: JSON.stringify({ title, head: branchName, base, body, draft: true }),
  });
}

function extractJson(text: string) {
  const fenced = text.match(/\x60\x60\x60(?:json)?\s*([\s\S]*?)\s*\x60\x60\x60/i);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Coding agent returned no JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

export async function executeCodingTask(input: {
  repo?: string;
  objective: string;
  base?: string;
  createPullRequest?: boolean;
  maxFiles?: number;
  model?: string;
  maxIterations?: number;
}) {
  const repoName = input.repo ?? "ly7902800-coder/A";
  const base = input.base ?? "main";
  const model = input.model ?? "anthropic/claude-opus-5-5";
  const maxIterations = Math.min(Math.max(input.maxIterations ?? 3, 1), 5);
  const maxFiles = Math.min(Math.max(input.maxFiles ?? 20, 1), 30);

  const files = await readRepository(repoName, base);
  const snapshot = files.map((file) => "FILE: " + file.path + "\n" + file.content.slice(0, 12000)).join("\n\n");
  const prompt =
    "You are Genesis Coding Agent. Return strict JSON only: " +
    '{"summary":"...","changes":[{"path":"...","content":"complete file content"}]}.' +
    "\nObjective: " + input.objective + "\nRepository:\n" + snapshot;

  const plan = extractJson(
    (await chatExtended({ model, messages: [{ role: "user", content: prompt }], maxTokens: 120000 })).text,
  );
  let changes = (Array.isArray(plan.changes) ? plan.changes : []).slice(0, maxFiles) as Change[];
  if (!changes.length) throw new Error("No changes proposed");

  const branchName = "genesis/agent-" + Date.now().toString(36);
  await createBranch(repoName, branchName, base);

  const changedFiles = new Set<string>();
  for (const change of changes) {
    await writeFile(repoName, change.path, change.content, branchName, "feat(agent): " + String(plan.summary ?? "automated coding change").slice(0, 72));
    changedFiles.add(change.path);
  }

  let checks: any = { status: "not-run" };
  let iterations = 0;

  for (iterations = 1; iterations <= maxIterations; iterations++) {
    const started = await dispatchChecks(repoName, branchName);
    checks = await waitForChecks(repoName, branchName, started);
    if (checks.conclusion === "success") break;
    if (iterations === maxIterations || checks.status === "timeout") break;

    const failure = await checkLogs(repoName, checks.runId);
    const current = await readRepository(repoName, branchName);
    const currentSnapshot = current.map((file) => "FILE: " + file.path + "\n" + file.content.slice(0, 12000)).join("\n\n");
    const repairPrompt =
      "Repair the current repository after CI failure. Return strict JSON only: " +
      '{"summary":"...","changes":[{"path":"...","content":"complete file content"}]}.' +
      "\nObjective: " + input.objective + "\nCI failure logs:\n" + failure + "\nCurrent branch files:\n" + currentSnapshot;
    const repair = extractJson(
      (await chatExtended({ model, messages: [{ role: "user", content: repairPrompt }], maxTokens: 120000 })).text,
    );
    changes = (Array.isArray(repair.changes) ? repair.changes : []).slice(0, maxFiles) as Change[];
    if (!changes.length) break;
    for (const change of changes) {
      await writeFile(repoName, change.path, change.content, branchName, "fix(agent): " + String(repair.summary ?? "automated CI repair").slice(0, 72));
      changedFiles.add(change.path);
    }
  }

  let pullRequest: { number: number; url: string } | undefined;
  if (input.createPullRequest !== false && checks.conclusion === "success") {
    const pr = await createPR(
      repoName,
      branchName,
      base,
      "Genesis Agent: " + String(plan.summary ?? input.objective).slice(0, 90),
      "Automated Genesis Coding Agent change with iterative CI repair. Objective: " + input.objective,
    );
    pullRequest = { number: pr.number, url: pr.html_url };
  }

  return { branch: branchName, changedFiles: [...changedFiles], iterations, checks, pullRequest };
}
