import crypto from "node:crypto";

export type OAuthPlatform = "github" | "cloudflare" | "figma" | "google";

export interface OAuthConfig {
  platform: OAuthPlatform;
  clientId: string;
  clientSecret?: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  usePkce: boolean;
}

export interface OAuthStart {
  platform: OAuthPlatform;
  state: string;
  codeVerifier?: string;
  authorizationUrl: string;
}

const pending = new Map<string, { platform: OAuthPlatform; codeVerifier?: string; createdAt: number }>();

function config(platform: OAuthPlatform): OAuthConfig {
  if (platform === "github") return {
    platform, clientId: process.env.GITHUB_OAUTH_CLIENT_ID ?? "", clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
    authorizationUrl: "https://github.com/login/oauth/authorize", tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["read:user", "user:email", "repo"], usePkce: true
  };
  if (platform === "cloudflare") return {
    platform, clientId: process.env.CLOUDFLARE_OAUTH_CLIENT_ID ?? "", clientSecret: process.env.CLOUDFLARE_OAUTH_CLIENT_SECRET,
    authorizationUrl: "https://dash.cloudflare.com/oauth2/auth", tokenUrl: "https://dash.cloudflare.com/oauth2/token",
    scopes: ["account:read", "zone:read"], usePkce: true
  };
  if (platform === "figma") return {
    platform, clientId: process.env.FIGMA_OAUTH_CLIENT_ID ?? "", clientSecret: process.env.FIGMA_OAUTH_CLIENT_SECRET,
    authorizationUrl: "https://www.figma.com/oauth", tokenUrl: "https://api.figma.com/v1/oauth/token",
    scopes: ["file_content:read", "file_metadata:read"], usePkce: true
  };
  return {
    platform, clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "", clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth", tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "openid", "email", "profile",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
      "https://www.googleapis.com/auth/calendar.readonly"
    ], usePkce: true
  };
}

function base64url(value: Buffer) {
  return value.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function pkce() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function listOAuthPlatforms() {
  return (["github", "cloudflare", "figma", "google"] as OAuthPlatform[]).map((platform) => {
    const c = config(platform);
    return { platform, configured: Boolean(c.clientId && c.clientSecret), authorizationUrl: c.authorizationUrl, scopes: c.scopes, pkce: c.usePkce };
  });
}

export function startOAuth(platform: OAuthPlatform, redirectUri: string): OAuthStart {
  const c = config(platform);
  if (!c.clientId) throw new Error(`Missing OAuth client id for ${platform}`);
  const state = base64url(crypto.randomBytes(24));
  const pair = c.usePkce ? pkce() : undefined;
  pending.set(state, { platform, codeVerifier: pair?.verifier, createdAt: Date.now() });
  const url = new URL(c.authorizationUrl);
  url.searchParams.set("client_id", c.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  if (pair) {
    url.searchParams.set("code_challenge", pair.challenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  url.searchParams.set("scope", c.scopes.join(" "));
  if (platform === "google") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("include_granted_scopes", "true");
  }
  return { platform, state, codeVerifier: pair?.verifier, authorizationUrl: url.toString() };
}

export async function finishOAuth(platform: OAuthPlatform, code: string, state: string, redirectUri: string) {
  const pendingRequest = pending.get(state);
  if (!pendingRequest || pendingRequest.platform !== platform || Date.now() - pendingRequest.createdAt > 10 * 60_000) {
    throw new Error("Invalid or expired OAuth state");
  }
  pending.delete(state);
  const c = config(platform);
  if (!c.clientId) throw new Error(`Missing OAuth client id for ${platform}`);
  const body = new URLSearchParams({ client_id: c.clientId, code, redirect_uri: redirectUri, grant_type: "authorization_code" });
  if (c.clientSecret) body.set("client_secret", c.clientSecret);
  if (pendingRequest.codeVerifier) body.set("code_verifier", pendingRequest.codeVerifier);
  const response = await fetch(c.tokenUrl, {
    method: "POST",
    headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body
  });
  if (!response.ok) throw new Error(`OAuth token exchange failed: ${response.status}`);
  const token = await response.json() as Record<string, unknown>;
  return {
    platform,
    accessToken: typeof token.access_token === "string" ? token.access_token : undefined,
    refreshToken: typeof token.refresh_token === "string" ? token.refresh_token : undefined,
    expiresIn: typeof token.expires_in === "number" ? token.expires_in : undefined,
    scope: typeof token.scope === "string" ? token.scope : undefined
  };
}
