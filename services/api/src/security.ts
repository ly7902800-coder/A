const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

const requests = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string): boolean {
  const now = Date.now();
  const current = requests.get(key);

  if (!current || current.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (current.count >= MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

export function clientKey(request: import("node:http").IncomingMessage): string {
  const forwarded = request.headers["x-forwarded-for"];
  return typeof forwarded === "string" ? forwarded.split(",")[0].trim() : request.socket.remoteAddress ?? "unknown";
}
