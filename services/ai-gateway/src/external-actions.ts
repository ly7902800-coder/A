export interface ExternalAction {
  platformId: string;
  projectId: string;
  action: string;
  scopes: string[];
  approved: boolean;
  connectorSession?: string;
  dryRun?: boolean;
}

export interface IntegrationPlan {
  platformId: string;
  capability: string;
  requiredScopes: string[];
  authMethod: "oauth" | "api_key" | "connector" | "manual";
  steps: string[];
}

export function planIntegration(platformId: string, capability: string, requiredScopes: string[], authMethod: IntegrationPlan["authMethod"] = "oauth"): IntegrationPlan {
  return {
    platformId,
    capability,
    requiredScopes,
    authMethod,
    steps: ["discover_documented_api", "show_required_scopes", "request_user_approval", "connect_account", "validate_access", "configure_project", "audit_action"]
  };
}

export function canExecuteExternalAction(action: ExternalAction): boolean {
  if (action.dryRun) return true;
  return action.approved && action.scopes.length > 0 && Boolean(action.connectorSession);
}
