export type FeatureStatus = "core" | "adapter" | "planned";
export type FeatureCategory = "ai" | "engineering" | "build" | "game" | "3d" | "devops" | "security" | "collaboration" | "media";

export interface GenesisFeature {
  id: string;
  name: string;
  category: FeatureCategory;
  status: FeatureStatus;
  description: string;
  requires: string[];
}

type FeatureTuple = [string,string,FeatureCategory,FeatureStatus,string,string[]];

const MORE_FEATURES: FeatureTuple[] = [
  ["semantic-memory","Semantic Memory","ai","planned","Vector-backed retrieval for approved memories and project knowledge.",["database","embeddings"]],
  ["memory-controls","Memory Controls","ai","planned","View, export and delete individual memories.",["auth"]],
  ["prompt-library","Prompt Library","ai","planned","Versioned reusable prompts and agent instructions.",["database"]],
  ["workflow-builder","Visual Workflow Builder","ai","planned","Compose agents and tools into reusable workflows.",["orchestrator"]],
  ["task-queue","Durable Task Queue","engineering","planned","Queue long-running AI and build jobs.",["queue"]],
  ["job-retry","Automatic Job Retry","engineering","planned","Retry transient failures with bounded backoff.",["task-queue"]],
  ["sandbox-execution","Sandboxed Code Execution","security","planned","Run untrusted generated code in isolated workers.",["sandbox"]],
  ["secret-vault","Secret Vault","security","planned","Store integration secrets without exposing them to clients.",["auth","kms"]],
  ["audit-log","Audit Log","security","planned","Record sensitive tool and permission events.",["database"]],
  ["rbac","Role Based Access Control","security","planned","Project and workspace roles with scoped permissions.",["auth"]],
  ["oauth-connectors","OAuth Connector Manager","security","planned","Connect external platforms with explicit scopes.",["oauth","approvals"]],
  ["approval-center","Approval Center","security","core","Central approval flow for external and destructive actions.",["approvals"]],
  ["file-workspace","File Workspace","engineering","planned","Project files with metadata, versions and access control.",["storage"]],
  ["artifact-store","Artifact Store","build","planned","Store build outputs, checksums and metadata.",["storage"]],
  ["build-cache","Build Cache","build","planned","Reuse safe build dependencies and intermediate artifacts.",["artifact-store"]],
  ["release-channels","Release Channels","build","planned","Manage dev, staging and production release channels.",["artifact-store","approvals"]],
  ["rollback-manager","Rollback Manager","devops","planned","Track releases and prepare approval-gated rollbacks.",["release-channels"]],
  ["deployment-manager","Deployment Manager","devops","planned","Coordinate deployments across supported targets.",["release-channels","connectors"]],
  ["observability-dashboard","Observability Dashboard","devops","planned","Unified logs, metrics, traces and build diagnostics.",["sentry","datadog"]],
  ["cost-metering","AI Cost Metering","devops","planned","Track provider usage and estimated project cost.",["provider-telemetry"]],
  ["usage-budgets","Usage Budgets","devops","planned","Set limits and alerts for AI/build usage.",["cost-metering"]],
  ["model-fallback","Model Fallback Chains","ai","core","Continue through configured providers after transient failures.",["model-router"]],
  ["structured-output","Structured AI Output","ai","core","Validate model output against typed schemas.",["model-router"]],
  ["vision-ocr","Vision and OCR Pipeline","ai","planned","Extract structured information from images and documents.",["vision-model","storage"]],
  ["document-ingestion","Document Ingestion","ai","planned","Parse project documents into searchable context.",["storage","embeddings"]],
  ["codebase-index","Codebase Semantic Index","engineering","planned","Index repositories for symbol and semantic retrieval.",["embeddings","github-adapter"]],
  ["dependency-auditor","Dependency Auditor","security","planned","Detect outdated, risky or incompatible dependencies.",["codebase-index"]],
  ["api-contract-generator","API Contract Generator","engineering","planned","Generate typed API contracts and validation schemas.",["project-spec"]],
  ["database-schema-agent","Database Schema Agent","engineering","planned","Plan tables, indexes, migrations and access policies.",["project-spec"]],
  ["ui-system-generator","UI System Generator","engineering","planned","Generate design tokens and reusable UI component specs.",["figma"]],
  ["accessibility-auditor","Accessibility Auditor","security","planned","Check UI plans for keyboard, contrast and semantic accessibility.",["ui-system-generator"]],
  ["localization-engine","Localization Engine","engineering","planned","Manage translation keys, locale fallback and formatting.",["file-workspace"]],
  ["notification-center","Notification Center","collaboration","planned","Unified in-app job, approval and deployment notifications.",["task-queue"]],
  ["team-workspaces","Team Workspaces","collaboration","planned","Shared projects with member roles and project boundaries.",["rbac"]],
  ["real-time-collaboration","Real-time Collaboration","collaboration","planned","Synchronize project edits and task state across users.",["team-workspaces","realtime"]],
  ["media-pipeline","Media Processing Pipeline","media","planned","Coordinate image, audio and video transformations.",["storage","task-queue"]],
  ["app-store-preflight","App Store Preflight","build","planned","Validate mobile release metadata and build prerequisites.",["build-pipeline"]],
  ["security-scanner","AI Security Scanner","security","planned","Scan generated projects for common security configuration issues.",["codebase-index"]],
  ["disaster-recovery","Disaster Recovery","devops","planned","Backup and restore project metadata and artifacts.",["artifact-store","database"]],
  ["performance-profiler","AI Performance Profiler","devops","planned","Profile application, build and AI workloads to identify latency, memory and throughput bottlenecks.",["observability-dashboard","build-pipeline"]],
  ["creative-image-generation","AI Image Studio","media","planned","Generate and edit images from prompts, references and project assets.",["media-pipeline"]],
  ["creative-video-generation","AI Video Studio","media","planned","Generate short and long-form videos from scripts, prompts, storyboards and approved source media.",["media-pipeline","task-queue"]],
  ["video-web-research","Web Video Research","media","planned","Find web media from permitted sources, verify usage rights, collect metadata and prepare an edit plan.",["research","media-pipeline"]],
  ["automatic-video-editor","AI Video Editor","media","planned","Assemble clips, transitions, captions, music and narration from a structured brief.",["creative-video-generation","media-pipeline"]],
  ["subtitle-transcription","Speech Transcription and Subtitles","media","planned","Transcribe user-provided or licensed audio and generate timed subtitles.",["vision-ocr","media-pipeline"]],
  ["quran-script-subtitles","Arabic Script Typography","media","planned","Render Arabic captions with selectable approved Arabic/Quran-style typography and precise timing; requires appropriate font/content licensing.",["subtitle-transcription"]],
  ["voice-input","Real-time Voice Input","ai","planned","Understand user-provided voice messages and live speech.",["speech-to-text","realtime"]],
  ["voice-conversation","Real-time Voice Conversation","ai","planned","Low-latency bidirectional voice conversation with interruption handling.",["voice-input","text-to-speech","realtime"]],
  ["app-builder","AI App Builder","engineering","planned","Generate full-stack web and mobile application plans and implementation tasks from requirements.",["codebase-engineer","cloud-ide","build-pipeline"]],
  ["website-builder","AI Website Builder","engineering","planned","Generate responsive websites, components, content structure and deployment configuration.",["ui-system-generator","codebase-engineer"]],
  ["api-discovery","API Discovery Assistant","engineering","planned","Identify suitable documented APIs for a requested capability and prepare integration plans.",["research","oauth-connectors"]],
  ["account-connected-api-setup","Account-Connected Integration Setup","security","planned","With explicit authorization, guide or execute supported OAuth integrations and retrieve permitted API configuration.",["oauth-connectors","approval-center","secret-vault"]],
  ["license-rights-check","Media Rights Check","security","planned","Track source URLs, licenses and usage restrictions before media is used in generated projects.",["video-web-research","audit-log"]],
  ["creative-storyboard","AI Storyboard Director","media","planned","Turn a brief into scenes, shots, timing, narration and asset requirements.",["creative-video-generation"]],
  ["voice-casting","AI Voice Casting","media","planned","Select or generate approved synthetic narration voices and map them to scenes.",["text-to-speech","media-pipeline"]],
  ["audio-postproduction","AI Audio Postproduction","media","planned","Clean, mix and synchronize narration, music and effects for project media.",["media-pipeline"]],
  ["media-render-queue","Media Render Queue","build","planned","Queue long-running image/video/audio generation and rendering jobs with progress and retries.",["task-queue","job-retry"]],
  ["creative-asset-library","Creative Asset Library","media","planned","Version and organize generated images, video, audio, subtitles and project references.",["artifact-store","file-workspace"]],
  ["api-secret-rotation","Integration Secret Rotation","security","planned","Rotate supported credentials and revoke old access after explicit approval.",["secret-vault","oauth-connectors","audit-log"]],
  ["connector-health","Connector Health Monitor","devops","planned","Detect expired, revoked or failing external integrations and request reauthorization.",["oauth-connectors","observability-dashboard"]]
];

export const ADDITIONAL_GENESIS_FEATURES: GenesisFeature[] = MORE_FEATURES.map(([id,name,category,status,description,requires]) => ({id,name,category,status,description,requires}));

export function listAdditionalFeatures(status?: FeatureStatus) {
  return ADDITIONAL_GENESIS_FEATURES.filter(f => !status || f.status === status);
}
