import crypto from "node:crypto";

interface SecretRecord {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

const records = new Map<string, SecretRecord>();

export function storeConnectorTokens(input: SecretRecord) {
  const ref = `vault_${crypto.randomBytes(24).toString("hex")}`;
  records.set(ref, input);
  return ref;
}

export function getConnectorTokens(ref: string) {
  return records.get(ref) ?? null;
}

export function revokeConnectorTokens(ref?: string) {
  if (ref) records.delete(ref);
}
