export const WORKSPACE_DB_SCHEMA = `
create table if not exists workspaces (
  id text primary key,
  name text not null,
  description text not null default '',
  icon text not null default '',
  color text not null default '',
  created_at text not null,
  updated_at text not null,
  last_opened_at text
);

create table if not exists workspace_source_nodes (
  id text primary key,
  workspace_id text not null,
  parent_id text,
  kind text not null,
  name text not null,
  path text not null default '',
  enabled integer not null default 1,
  position integer not null default 0,
  created_at text not null,
  updated_at text not null,
  foreign key (workspace_id) references workspaces(id) on delete cascade
);

create table if not exists app_settings (
  key text primary key,
  value_json text not null,
  updated_at text not null
);

create table if not exists recent_workspace_entries (
  workspace_id text primary key,
  opened_at text not null,
  foreign key (workspace_id) references workspaces(id) on delete cascade
);
`
