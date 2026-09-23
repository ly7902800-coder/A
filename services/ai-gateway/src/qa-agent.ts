export interface QACheck {
  id: string;
  name: string;
  severity: "info" | "warning" | "error";
  passed: boolean;
  message: string;
}

export function createQAChecks(): QACheck[] {
  return [
    { id: "build", name: "Build output exists", severity: "error", passed: false, message: "Waiting for build runner." },
    { id: "tests", name: "Automated tests", severity: "error", passed: false, message: "Waiting for test runner." },
    { id: "artifacts", name: "Artifacts recorded", severity: "warning", passed: false, message: "Waiting for artifact store." }
  ];
}
