export type PlatformPermissionScope =
  | "read"
  | "write"
  | "build"
  | "deploy"
  | "publish"
  | "external_action";

export interface PlatformAccessRequest {
  platformId: string;
  projectId: string;
  scopes: PlatformPermissionScope[];
  reason: string;
}

export interface PlatformAccessDecision {
  status: "approval_required" | "approved";
  platformId: string;
  projectId: string;
  scopes: PlatformPermissionScope[];
  message: string;
}

const sessions = new Map<string, PlatformAccessRequest>();

export function requestPlatformAccess(request: PlatformAccessRequest): PlatformAccessDecision {
  const key = `${request.projectId}:${request.platformId}`;
  sessions.set(key, request);
  return {
    status: "approval_required",
    platformId: request.platformId,
    projectId: request.projectId,
    scopes: request.scopes,
    message: `Genesis wants permission to connect to ${request.platformId}. No external work starts until you approve these scopes.`
  };
}

export function approvePlatformAccess(projectId: string, platformId: string): PlatformAccessDecision {
  const key = `${projectId}:${platformId}`;
  const request = sessions.get(key);
  if (!request) throw new Error("No pending platform permission request");
  sessions.delete(key);
  return {
    status: "approved",
    platformId,
    projectId,
    scopes: request.scopes,
    message: "Access approved. Genesis may now perform only the approved scopes."
  };
}

export function revokePlatformAccess(projectId: string, platformId: string) {
  return sessions.delete(`${projectId}:${platformId}`);
}
