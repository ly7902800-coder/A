export interface ExternalAction {
  platformId: string;
  projectId: string;
  action: string;
  scopes: string[];
  approved: boolean;
}

export function canExecuteExternalAction(action: ExternalAction): boolean {
  return action.approved && action.scopes.length > 0;
}
