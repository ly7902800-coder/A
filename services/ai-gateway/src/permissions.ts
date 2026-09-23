export type PermissionAction =
  | "read"
  | "write"
  | "delete"
  | "publish"
  | "external_side_effect";

export interface PermissionRequest {
  action: PermissionAction;
  resource: string;
  reason: string;
}

export interface PermissionDecision {
  allowed: boolean;
  requiresApproval: boolean;
}

const APPROVAL_REQUIRED: PermissionAction[] = [
  "delete",
  "publish",
  "external_side_effect"
];

export function evaluatePermission(request: PermissionRequest): PermissionDecision {
  if (APPROVAL_REQUIRED.includes(request.action)) {
    return { allowed: false, requiresApproval: true };
  }

  return { allowed: true, requiresApproval: false };
}
