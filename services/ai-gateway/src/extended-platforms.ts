import { CREATIVE_PLATFORMS, type CreativePlatform } from "./creative-platforms.js";

export interface ExtendedPlatform extends CreativePlatform {
  integrationMode: "catalog" | "api" | "connector";
  permissionScopes: string[];
}

const EXTRA_PLATFORMS: ExtendedPlatform[] = [
  ["aws","Amazon Web Services","deployment",true,["compute","storage","database","containers","queues"],"https://aws.amazon.com/"],
  ["gcp","Google Cloud","deployment",true,["compute","storage","kubernetes","ai","databases"],"https://cloud.google.com/"],
  ["azure","Microsoft Azure","deployment",true,["compute","storage","containers","ai","databases"],"https://azure.microsoft.com/"],
  ["mongodb","MongoDB","backend",true,["database","atlas","search","vector"],"https://www.mongodb.com/"],
  ["neon","Neon","backend",true,["postgres","serverless","branching"],"https://neon.tech/"],
  ["planetscale","PlanetScale","backend",false,["mysql","serverless","branching"],"https://planetscale.com/"],
  ["upstash","Upstash","backend",true,["redis","kafka","serverless"],"https://upstash.com/"],
  ["stripe","Stripe","backend",false,["payments","subscriptions","billing","webhooks"],"https://stripe.com/"],
  ["twilio","Twilio","backend",true,["sms","voice","messaging","verify"],"https://www.twilio.com/"],
  ["clerk","Clerk","backend",true,["auth","organizations","sessions"],"https://clerk.com/"],
  ["auth0","Auth0","backend",true,["auth","oauth","sso","mfa"],"https://auth0.com/"],
  ["sentry","Sentry","deployment",true,["errors","performance","tracing","alerts"],"https://sentry.io/"],
  ["posthog","PostHog","deployment",true,["analytics","feature_flags","experiments","replay"],"https://posthog.com/"],
  ["datadog","Datadog","deployment",false,["logs","metrics","tracing","alerts"],"https://www.datadoghq.com/"],
  ["launchdarkly","LaunchDarkly","deployment",false,["feature_flags","experimentation","rollouts"],"https://launchdarkly.com/"],
  ["figma","Figma","assets",true,["design","prototyping","variables","dev_mode"],"https://www.figma.com/"],
  ["storybook","Storybook","code",true,["components","testing","documentation","visual_testing"],"https://storybook.js.org/"],
  ["expo","Expo","app_builder",true,["react_native","ios","android","web"],"https://expo.dev/"],
  ["flutter","Flutter","app_builder",true,["dart","android","ios","web","desktop"],"https://flutter.dev/"],
  ["capacitor","Capacitor","app_builder",true,["web_to_mobile","ios","android","plugins"],"https://capacitorjs.com/"],
  ["electron","Electron","app_builder",true,["desktop","javascript","typescript","chromium"],"https://www.electronjs.org/"],
  ["tauri","Tauri","app_builder",true,["desktop","rust","webview","security"],"https://tauri.app/"],
  ["playwright","Playwright","code",true,["browser_testing","e2e","automation"],"https://playwright.dev/"],
  ["cypress","Cypress","code",true,["e2e","component_testing","browser"],"https://www.cypress.io/"],
  ["vitest","Vitest","code",true,["unit_testing","typescript","vite"],"https://vitest.dev/"],
  ["pnpm","pnpm","code",true,["package_management","monorepos","workspaces"],"https://pnpm.io/"],
  ["kubernetes","Kubernetes","deployment",true,["orchestration","scaling","service_discovery"],"https://kubernetes.io/"],
  ["terraform","Terraform","deployment",true,["infrastructure_as_code","cloud","provisioning"],"https://www.terraform.io/"],
  ["ansible","Ansible","deployment",true,["automation","configuration","provisioning"],"https://www.ansible.com/"],
  ["khronos-vulkan","Vulkan","code",true,["graphics","compute","cross_platform"],"https://www.vulkan.org/"
];

export const EXTENDED_PLATFORMS: ExtendedPlatform[] = EXTRA_PLATFORMS.map(
  ([id,name,category,freeTier,capabilities,website]) => ({
    id, name, category: category as ExtendedPlatform["category"], freeTier,
    capabilities, adapterStatus: "catalog", website,
    integrationMode: "catalog", permissionScopes: ["read"]
  })
);

export const ALL_PLATFORMS = [...CREATIVE_PLATFORMS, ...EXTENDED_PLATFORMS];

export function listAllPlatforms() { return ALL_PLATFORMS; }
