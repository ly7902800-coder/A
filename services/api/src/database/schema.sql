-- Genesis AI standalone PostgreSQL schema
-- No Supabase dependency. Designed for PostgreSQL 16+.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  display_name text,
  avatar_url text,
  locale text NOT NULL DEFAULT 'ar',
  timezone text NOT NULL DEFAULT 'Asia/Baghdad',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_user_id text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  project_type text NOT NULL DEFAULT 'app',
  status text NOT NULL DEFAULT 'active',
  stack jsonb NOT NULL DEFAULT '[]',
  integrations jsonb NOT NULL DEFAULT '[]',
  requirements jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(project_id,user_id)
);

CREATE TABLE IF NOT EXISTS project_dna (
  project_id uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  decisions jsonb NOT NULL DEFAULT '[]',
  known_issues jsonb NOT NULL DEFAULT '[]',
  metadata jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  objective text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  risk_level text NOT NULL DEFAULT 'low',
  approval_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  error text
);

CREATE TABLE IF NOT EXISTS mission_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  title text NOT NULL,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  position integer NOT NULL,
  input jsonb NOT NULL DEFAULT '{}',
  output jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mission_id, step_key)
);

CREATE TABLE IF NOT EXISTS approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES missions(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target text,
  scopes jsonb NOT NULL DEFAULT '[]',
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS platform_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  platform_id text NOT NULL,
  mode text NOT NULL,
  status text NOT NULL DEFAULT 'approval_required',
  scopes jsonb NOT NULL DEFAULT '[]',
  credential_ref text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, platform_id)
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  platform_id text NOT NULL,
  provider_account_id text,
  access_token_ref text NOT NULL,
  refresh_token_ref text,
  scopes jsonb NOT NULL DEFAULT '[]',
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'connected',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform_id, provider_account_id)
);

CREATE TABLE IF NOT EXISTS browser_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  platform_id text NOT NULL,
  status text NOT NULL DEFAULT 'awaiting_user',
  user_must_complete_login boolean NOT NULL DEFAULT true,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  kind text NOT NULL,
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  importance real NOT NULL DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  model text,
  provider text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  target text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  source_ref text,
  version text,
  logs jsonb NOT NULL DEFAULT '[]',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  build_id uuid REFERENCES builds(id) ON DELETE SET NULL,
  kind text NOT NULL,
  name text NOT NULL,
  uri text,
  checksum text,
  size_bytes bigint,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label text NOT NULL,
  snapshot_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  action text NOT NULL,
  target text,
  status text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connector_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  platform_id text NOT NULL,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  input jsonb NOT NULL DEFAULT '{}',
  output jsonb,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  run_after timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_missions_project ON missions(project_id);
CREATE INDEX IF NOT EXISTS idx_mission_steps_mission ON mission_steps(mission_id, position);
CREATE INDEX IF NOT EXISTS idx_approvals_project_status ON approvals(project_id,status);
CREATE INDEX IF NOT EXISTS idx_connections_user ON platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_user_project ON memories(user_id,project_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_updated ON chats(user_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON chat_messages(chat_id,created_at);
CREATE INDEX IF NOT EXISTS idx_builds_project_created ON builds(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_project_created ON audit_logs(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_ready ON connector_jobs(status,run_after);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS project_dna_updated_at ON project_dna;
CREATE TRIGGER project_dna_updated_at BEFORE UPDATE ON project_dna FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS mission_steps_updated_at ON mission_steps;
CREATE TRIGGER mission_steps_updated_at BEFORE UPDATE ON mission_steps FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS platform_connections_updated_at ON platform_connections;
CREATE TRIGGER platform_connections_updated_at BEFORE UPDATE ON platform_connections FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS oauth_accounts_updated_at ON oauth_accounts;
CREATE TRIGGER oauth_accounts_updated_at BEFORE UPDATE ON oauth_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS memories_updated_at ON memories;
CREATE TRIGGER memories_updated_at BEFORE UPDATE ON memories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS chats_updated_at ON chats;
CREATE TRIGGER chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION set_updated_at();


CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(token_hash,expires_at) WHERE revoked_at IS NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;

CREATE TABLE IF NOT EXISTS secret_vault (
  ref text PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  auth_tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_secret_vault_user ON secret_vault(user_id);
