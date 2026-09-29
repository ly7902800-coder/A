import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 8090);
const ROOT = process.env.WORKSPACE_ROOT || "/workspace";
const sessions = new Map();

await fs.mkdir(ROOT, { recursive: true });

function safeId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80) || crypto.randomUUID();
}
function workspaceDir(sessionId) {
  return path.join(ROOT, safeId(sessionId));
}
function previewAuth(url) {
  const secret = process.env.WORKER_SHARED_SECRET || "";
  const sessionId = safeId(url.searchParams.get("sessionId"));
  const supplied = url.searchParams.get("access") || "";
  const expected = crypto.createHmac("sha256", secret).update(sessionId).digest("hex");
  const valid = supplied.length === expected.length && crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  if (!secret || !valid) {
    const e = new Error("Preview authentication failed");
    e.statusCode = 401;
    throw e;
  }
  return sessionId;
}
function auth(req) {
  const expected = process.env.WORKER_SHARED_SECRET;
  if (!expected) throw new Error("WORKER_SHARED_SECRET is not configured");
  const supplied = req.headers["x-worker-token"];
  if (supplied !== expected) {
    const e = new Error("Worker authentication failed");
    e.statusCode = 401;
    throw e;
  }
}
function send(res, status, data, headers = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(data));
}
async function body(req) {
  let value = "";
  for await (const chunk of req) {
    value += chunk;
    if (value.length > 2_000_000) throw new Error("request too large");
  }
  return value ? JSON.parse(value) : {};
}
function projectRoot(dir) {
  return path.join(dir, "apps", "mobile");
}
function resolveInside(root, requested) {
  const target = path.resolve(root, requested || "");
  if (target !== root && !target.startsWith(root + path.sep)) {
    const e = new Error("Path escapes workspace");
    e.statusCode = 400;
    throw e;
  }
  return target;
}
async function execCapture(command, cwd, timeout = 180000, extraEnv = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn("bash", ["-lc", command], {
      cwd,
      env: { ...process.env, ...extraEnv, TERM: "xterm-256color" },
    });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("command timed out"));
    }, timeout);
    child.stdout.on("data", d => stdout += d.toString());
    child.stderr.on("data", d => stderr += d.toString());
    child.on("error", reject);
    child.on("close", code => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}
async function cloneRepo(repo, branch, dir) {
  await fs.mkdir(dir, { recursive: true });
  const token = process.env.GITHUB_TOKEN;
  const env = token ? {
    GIT_TERMINAL_PROMPT: "0",
    GIT_ASKPASS: "/usr/local/bin/genesis-git-askpass",
    GIT_TOKEN: token,
  } : {};
  if (token) {
    await fs.writeFile("/usr/local/bin/genesis-git-askpass", "#!/bin/sh\necho \"$GIT_TOKEN\"\n");
    await fs.chmod("/usr/local/bin/genesis-git-askpass", 0o700);
  }
  const url = "https://github.com/" + repo + ".git";
  const result = await execCapture("git clone --branch " + JSON.stringify(branch) + " --single-branch " + JSON.stringify(url) + " .", dir, 240000, env);
  if (result.code !== 0) throw new Error(result.stderr || "git clone failed");
}
async function ensureSession(sessionId, repo, branch) {
  const id = safeId(sessionId);
  let s = sessions.get(id);
  if (s) return s;
  const dir = workspaceDir(id);
  try {
    await fs.access(path.join(dir, ".git"));
  } catch {
    await fs.rm(dir, { recursive: true, force: true });
    await cloneRepo(repo, branch, dir);
  }
  s = { id, repo, branch, dir, debug: null, previewPort: null, browserDebugPort: null, vmServiceUrl: null, devtoolsUrl: null, logs: [], createdAt: Date.now(), lastHeartbeat: Date.now() };
  sessions.set(id, s);
  return s;
}
function log(s, type, data) {
  const line = String(data || "");
  s.logs.push({ at: new Date().toISOString(), type, data: line.slice(0, 10000) });
  if (s.logs.length > 500) s.logs.splice(0, s.logs.length - 500);
}
function nextPort() {
  const used = new Set([...sessions.values()].map(s => s.previewPort).filter(Boolean));
  for (let p = 10000; p < 10100; p++) if (!used.has(p)) return p;
  throw new Error("No preview ports available");
}
async function startDebug(s) {
  if (s.debug && !s.debug.killed) return s;
  const port = nextPort();
  s.previewPort = port;
  const cwd = projectRoot(s.dir);
  const browserDebugPort = port + 1;
  s.browserDebugPort = browserDebugPort;
  const child = spawn("flutter", [
    "run", "-d", "chrome",
    "--web-hostname", "127.0.0.1",
    "--web-port", String(port),
    "--web-run-headless",
    "--web-browser-debug-port", String(browserDebugPort),
    "--web-browser-flag=--no-sandbox"
  ], { cwd, env: { ...process.env, TERM: "xterm-256color" }});
  s.debug = child;
  log(s, "system", "Starting Flutter debug server on " + port);
  const capture = data => { const text = data.toString(); log(s, "stdout", text); const vm = text.match(/http:\/\/127\.0\.0\.1:\d+\/[^\s]+/); if (vm && text.includes("VM Service")) s.vmServiceUrl = vm[0]; const dt = text.match(/http:\/\/127\.0\.0\.1:\d+\?uri=[^\s]+/); if (dt) s.devtoolsUrl = dt[0]; };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  child.on("close", code => {
    log(s, "system", "Flutter debug process exited with code " + code);
    s.debug = null;
    s.previewPort = null;
    s.browserDebugPort = null;
  });
  for (let i = 0; i < 12 && s.debug && !s.devtoolsUrl; i++) {
    await new Promise(r => setTimeout(r, 1000));
  }
  return s;
}
async function stopDebug(s) {
  if (s.debug) {
    s.debug.kill("SIGTERM");
    s.debug = null;
  }
  s.previewPort = null;
  s.browserDebugPort = null;
  s.vmServiceUrl = null;
  s.devtoolsUrl = null;
}
async function sendDebugKey(s, key) {
  if (!s.debug || s.debug.killed || !s.debug.stdin.writable) {
    const e = new Error("Debug session is not running");
    e.statusCode = 409;
    throw e;
  }
  s.debug.stdin.write(key);
  return { ok: true, action: key === "r" ? "hot-reload" : "hot-restart" };
}
async function tree(dir, current = "") {
  const root = resolveInside(dir, current);
  const entries = await fs.readdir(root, { withFileTypes: true });
  const out = [];
  for (const entry of entries.slice(0, 500)) {
    if ([".git", ".dart_tool", "build"].includes(entry.name)) continue;
    const rel = path.posix.join(current.replaceAll("\\", "/"), entry.name);
    out.push({ name: entry.name, path: rel, type: entry.isDirectory() ? "directory" : "file" });
  }
  return out.sort((a,b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "directory" ? -1 : 1));
}
async function gitSync(s, file, message) {
  const cwd = s.dir;
  const env = process.env.GITHUB_TOKEN ? {
    GIT_TERMINAL_PROMPT: "0",
    GIT_ASKPASS: "/usr/local/bin/genesis-git-askpass",
    GIT_TOKEN: process.env.GITHUB_TOKEN,
  } : {};
  const add = await execCapture("git add -- " + JSON.stringify(file), cwd, 30000, env);
  if (add.code) throw new Error(add.stderr || "git add failed");
  const commit = await execCapture("git diff --cached --quiet || git commit -m " + JSON.stringify(message || "Genesis Cloud Flutter edit"), cwd, 30000, env);
  if (commit.code) throw new Error(commit.stderr || "git commit failed");
  const push = await execCapture("git push origin " + JSON.stringify(s.branch), cwd, 120000, env);
  if (push.code) throw new Error(push.stderr || "git push failed");
}
async function previewProxy(req, res, s, requestPath) {
  if (!s.previewPort) return send(res, 409, { error: "Preview is not running" });
  const target = new URL(requestPath || "/", "http://127.0.0.1:" + s.previewPort);
  const proxy = http.request({
    hostname: "127.0.0.1",
    port: s.previewPort,
    path: target.pathname + target.search,
    method: req.method,
    headers: { ...req.headers, host: "127.0.0.1:" + s.previewPort },
  }, upstream => {
    res.writeHead(upstream.statusCode || 502, upstream.headers);
    upstream.pipe(res);
  });
  proxy.on("error", e => send(res, 502, { error: e.message }));
  req.pipe(proxy);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    if (url.pathname === "/health") return send(res, 200, {
      ok: true,
      service: "genesis-cloud-flutter-worker",
      sessions: sessions.size,
      uptime: process.uptime()
    });
    if (url.pathname.startsWith("/preview/") || url.pathname === "/preview") {
      const id = previewAuth(url);
      const s = sessions.get(id);
      if (!s) return send(res, 404, { error: "session not found" });
      s.lastHeartbeat = Date.now();
      return previewProxy(req, res, s, url.pathname.replace(/^\/preview/, "") + url.search);
    }
    auth(req);

    if (req.method !== "POST") return send(res, 404, { error: "not found" });
    const b = await body(req);
    const sessionId = safeId(b.sessionId);
    const s = await ensureSession(sessionId, b.repo, b.branch);
    s.lastHeartbeat = Date.now();
    const cwd = projectRoot(s.dir);

    if (url.pathname === "/v1/workspace/start") {
      const webConfig = await fs.access(path.join(cwd, "web")).then(() => true).catch(() => false);
      if (!webConfig) { const scaffold = await execCapture("flutter create --platforms=web --project-name genesis_cloud .", cwd, 240000); if (scaffold.code) throw new Error(scaffold.stderr || "Flutter web scaffold failed"); }
      await execCapture("flutter pub get", cwd, 240000);
      return send(res, 200, { ok: true, sessionId: s.id, status: "ready" });
    }
    if (url.pathname === "/v1/workspace/tree") {
      return send(res, 200, { entries: await tree(cwd, String(b.path || "")) });
    }
    if (url.pathname === "/v1/workspace/file/read") {
      const file = String(b.path || "");
      const target = resolveInside(cwd, file);
      return send(res, 200, { path: file, content: await fs.readFile(target, "utf8") });
    }
    if (url.pathname === "/v1/workspace/file/write") {
      const file = String(b.path || "");
      const target = resolveInside(cwd, file);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, String(b.content || ""), "utf8");
      if (b.sync !== false) await gitSync(s, file, String(b.message || "Genesis Cloud Flutter edit"));
      return send(res, 200, { ok: true, path: file, synced: b.sync !== false });
    }
    if (url.pathname === "/v1/workspace/command") {
      const allowed = new Set([
        "flutter pub get", "flutter analyze", "flutter test",
        "flutter build apk --release", "flutter build appbundle --release",
        "flutter build web --release", "dart format .", "git status --short"
      ]);
      if (!allowed.has(b.command)) return send(res, 400, { error: "command not allowed", allowed: [...allowed] });
      const r = await execCapture(b.command, cwd, 300000);
      return send(res, r.code === 0 ? 200 : 422, { ok: r.code === 0, exitCode: r.code, stdout: r.stdout, stderr: r.stderr });
    }
    if (url.pathname === "/v1/debug/start") {
      await startDebug(s);
      return send(res, 200, { ok: true, sessionId: s.id, previewPort: s.previewPort, previewPath: "/preview?sessionId=" + encodeURIComponent(s.id) });
    }
    if (url.pathname === "/v1/debug/stop") {
      await stopDebug(s);
      return send(res, 200, { ok: true });
    }
    if (url.pathname === "/v1/debug/hot-reload") return send(res, 200, await sendDebugKey(s, "r"));
    if (url.pathname === "/v1/debug/hot-restart") return send(res, 200, await sendDebugKey(s, "R"));
    if (url.pathname === "/v1/debug/status") {
      return send(res, 200, {
        running: Boolean(s.debug && !s.debug.killed),
        sessionId: s.id,
        previewPort: s.previewPort,
        browserDebugPort: s.browserDebugPort,
        vmServiceUrl: s.vmServiceUrl,
        devtoolsUrl: s.devtoolsUrl,
        previewPath: s.previewPort ? "/preview?sessionId=" + encodeURIComponent(s.id) : null,
        logs: s.logs.slice(-100)
      });
    }
    if (url.pathname === "/v1/debug/logs") return send(res, 200, { logs: s.logs.slice(-200) });
    if (url.pathname === "/v1/debug/inspector") {
      return send(res, 200, {
        supported: true,
        mode: "web-server",
        note: "Flutter web-server provides limited debugging; use a browser debug target for full inspector integration.",
        widgetTree: [],
      });
    }
    if (url.pathname === "/v1/devtools") {
      return send(res, 200, { supported: Boolean(s.devtoolsUrl), url: s.devtoolsUrl, vmServiceUrl: s.vmServiceUrl });
    }
    return send(res, 404, { error: "unknown route" });
  } catch (e) {
    const status = Number(e?.statusCode || 500);
    send(res, status, { error: e instanceof Error ? e.message : String(e) });
  }
});

const wss = new WebSocketServer({ server, path: "/v1/terminal" });
wss.on("connection", async (ws, req) => {
  let proc = null;
  try {
    const url = new URL(req.url || "/", "http://localhost");
    const sessionId = safeId(url.searchParams.get("sessionId"));
    const supplied = url.searchParams.get("access") || "";
    const secret = process.env.WORKER_SHARED_SECRET || "";
    const expected = crypto.createHmac("sha256", secret).update(sessionId).digest("hex");
    if (!secret || supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
      ws.close(1008, "authentication failed");
      return;
    }
    const repo = url.searchParams.get("repo") || "";
    const branch = url.searchParams.get("branch") || "";
    if (!repo || !branch) {
      ws.close(1008, "repo and branch are required");
      return;
    }
    const s = await ensureSession(sessionId, repo, branch);
    ws.send(JSON.stringify({ type: "ready", sessionId: s.id }));
    ws.on("message", async raw => {
      try {
        const m = JSON.parse(String(raw));
        if (m.type === "exec") {
          const allowed = new Set(["flutter pub get","flutter analyze","flutter test","dart format .","git status --short"]);
          if (!allowed.has(m.command)) return ws.send(JSON.stringify({ type: "error", message: "command not allowed" }));
          if (proc) proc.kill("SIGTERM");
          proc = spawn("bash", ["-lc", m.command], { cwd: projectRoot(s.dir), env: { ...process.env, TERM: "xterm-256color" }});
          proc.stdout.on("data", x => ws.send(JSON.stringify({ type: "stdout", data: x.toString() })));
          proc.stderr.on("data", x => ws.send(JSON.stringify({ type: "stderr", data: x.toString() })));
          proc.on("close", code => { ws.send(JSON.stringify({ type: "exit", code })); proc = null; });
        }
        if (m.type === "stop" && proc) proc.kill("SIGTERM");
      } catch (e) {
        ws.send(JSON.stringify({ type: "error", message: e instanceof Error ? e.message : String(e) }));
      }
    });
    ws.on("close", () => { if (proc) proc.kill("SIGTERM"); });
  } catch (e) {
    ws.close(1011, e instanceof Error ? e.message : String(e));
  }
});

const lspWss = new WebSocketServer({ server, path: "/v1/lsp/dart" });
lspWss.on("connection", async (ws, req) => {
  let proc = null;
  let buffer = Buffer.alloc(0);
  try {
    const url = new URL(req.url || "/", "http://localhost");
    const sessionId = safeId(url.searchParams.get("sessionId"));
    const supplied = url.searchParams.get("access") || "";
    const secret = process.env.WORKER_SHARED_SECRET || "";
    const expected = crypto.createHmac("sha256", secret).update("lsp:" + sessionId).digest("hex");
    if (!secret || supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
      ws.close(1008, "authentication failed");
      return;
    }
    const repo = url.searchParams.get("repo") || "";
    const branch = url.searchParams.get("branch") || "";
    if (!repo || !branch) {
      ws.close(1008, "repo and branch are required");
      return;
    }
    const s = await ensureSession(sessionId, repo, branch);
    proc = spawn("dart", ["language-server", "--protocol=lsp", "--client-id=genesis-cloud-ide", "--client-version=1.0"], {
      cwd: projectRoot(s.dir),
      env: { ...process.env, TERM: "xterm-256color" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    proc.stderr.on("data", x => log(s, "lsp", x.toString()));
    proc.on("close", code => { if (ws.readyState === 1) ws.close(1011, "Dart language server exited: " + code); });

    const drain = () => {
      while (true) {
        const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"));
        if (headerEnd < 0) return;
        const header = buffer.subarray(0, headerEnd).toString("utf8");
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (!match) { buffer = buffer.subarray(headerEnd + 4); continue; }
        const length = Number(match[1]);
        const start = headerEnd + 4;
        if (buffer.length < start + length) return;
        const payload = buffer.subarray(start, start + length).toString("utf8");
        buffer = buffer.subarray(start + length);
        ws.send(payload);
      }
    };
    proc.stdout.on("data", chunk => { buffer = Buffer.concat([buffer, chunk]); drain(); });
    ws.on("message", raw => {
      const payload = Buffer.from(String(raw), "utf8");
      proc.stdin.write("Content-Length: " + payload.length + "\r\n\r\n");
      proc.stdin.write(payload);
    });
    ws.on("close", () => { if (proc) proc.kill("SIGTERM"); });
  } catch (e) {
    ws.close(1011, e instanceof Error ? e.message : String(e));
  }
});

setInterval(async () => {
  const ttl = Number(process.env.WORKSPACE_TTL_MS || 3600000);
  for (const [id, s] of sessions) {
    if (Date.now() - s.lastHeartbeat > ttl) {
      await stopDebug(s).catch(() => {});
      await fs.rm(s.dir, { recursive: true, force: true }).catch(() => {});
      sessions.delete(id);
    }
  }
}, 60000);

server.listen(PORT, () => console.log("Genesis Cloud Flutter Worker listening on " + PORT));
