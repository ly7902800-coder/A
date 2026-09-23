export type PlatformPermissionScope =
  | "read" | "write" | "build" | "deploy" | "publish" | "external_action"
  | "oauth" | "api_credentials" | "billing_read" | "media_read" | "media_write";

export interface PlatformAccessRequest { platformId: string; projectId: string; scopes: PlatformPermissionScope[]; reason: string; expiresInMinutes?: number; }
export interface PlatformAccessDecision { status: "approval_required" | "approved" | "revoked"; platformId: string; projectId: string; scopes: PlatformPermissionScope[]; message: string; }
export interface ConnectorSession { projectId: string; platformId: string; scopes: PlatformPermissionScope[]; accessTokenRef?: string; refreshTokenRef?: string; expiresAt?: number; status: "connected" | "revoked" | "expired"; }

const requests = new Map<string, PlatformAccessRequest>();
const sessions = new Map<string, ConnectorSession>();
const keyOf = (projectId: string, platformId: string) => `${projectId}:${platformId}`;

export function requestPlatformAccess(request: PlatformAccessRequest): PlatformAccessDecision {
  requests.set(keyOf(request.projectId, request.platformId), request);
  return { status: "approval_required", platformId: request.platformId, projectId: request.projectId, scopes: request.scopes, message: `Genesis wants permission to connect to ${request.platformId}. No external work starts until you approve these scopes.` };
}

export function approvePlatformAccess(projectId: string, platformId: string): PlatformAccessDecision {
  const request = requests.get(keyOf(projectId, platformId));
  if (!request) throw new Error("No pending platform permission request");
  requests.delete(keyOf(projectId, platformId));
  sessions.set(keyOf(projectId, platformId), { projectId, platformId, scopes: request.scopes, status: "connected" });
  return { status: "approved", platformId, projectId, scopes: request.scopes, message: "Access approved. Genesis may now perform only the approved scopes." };
}

export function attachConnectorCredentials(projectId: string, platformId: string, input: Pick<ConnectorSession, "accessTokenRef" | "refreshTokenRef" | "expiresAt">) {
  const session = sessions.get(keyOf(projectId, platformId));
  if (!session || session.status !== "connected") throw new Error("No approved connector session");
  sessions.set(keyOf(projectId, platformId), { ...session, ...input }); return sessions.get(keyOf(projectId, platformId));
}

export function getConnectorSession(projectId: string, platformId: string) {
  const session = sessions.get(keyOf(projectId, platformId));
  if (!session || session.status !== "connected") return null;
  if (session.expiresAt && session.expiresAt <= Date.now()) { sessions.set(keyOf(projectId, platformId), { ...session, status: "expired" }); return null; }
  return session;
}

export function revokePlatformAccess(projectId: string, platformId: string) {
  requests.delete(keyOf(projectId, platformId));
  const session = sessions.get(keyOf(projectId, platformId));
  if (session) sessions.set(keyOf(projectId, platformId), { ...session, status: "revoked", accessTokenRef: undefined, refreshTokenRef: undefined });
  return true;
}