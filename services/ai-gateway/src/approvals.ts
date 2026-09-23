import { randomUUID } from "node:crypto";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "consumed";

export interface ApprovalRequest {
  id: string;
  tool: string;
  input: unknown;
  action: string;
  resource: string;
  reason: string;
  status: ApprovalStatus;
  createdAt: string;
  decidedAt?: string;
}

const approvals = new Map<string, ApprovalRequest>();

export function createApproval(input: Omit<ApprovalRequest, "id" | "status" | "createdAt">) {
  const request: ApprovalRequest = {
    ...input,
    id: `approval_${randomUUID()}`,
    status: "pending",
    createdAt: new Date().toISOString()
  };
  approvals.set(request.id, request);
  return request;
}

export function listApprovals(status?: ApprovalStatus) {
  return [...approvals.values()].filter((item) => !status || item.status === status);
}

export function decideApproval(id: string, approved: boolean) {
  const request = approvals.get(id);
  if (!request) throw new Error("Approval request not found");
  if (request.status !== "pending") throw new Error("Approval request is no longer pending");
  request.status = approved ? "approved" : "rejected";
  request.decidedAt = new Date().toISOString();
  return request;
}

export function consumeApproval(id: string) {
  const request = approvals.get(id);
  if (!request || request.status !== "approved") throw new Error("Approval is not approved");
  request.status = "consumed";
  return request;
}
