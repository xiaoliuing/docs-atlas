#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const DESKTOP_SEED_VERSION_KEY: &str = "desktop_seed_version";
const CURRENT_DESKTOP_SEED_VERSION: &str = "2";

const WORKSPACE_DB_SCHEMA: &str = r#"
create table if not exists workspaces (
  id text primary key,
  name text not null,
  description text not null default '',
  icon text not null default '',
  color text not null default '',
  default_search_scope text not null default 'global',
  sort_order integer not null default 0,
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

create table if not exists workspace_source_scan_cache (
  source_root text primary key,
  fingerprint text not null,
  payload_json text not null,
  updated_at text not null
);
"#;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct WorkspaceDetailPayload {
  id: String,
  name: String,
  description: String,
  icon: String,
  color: String,
  default_search_scope: String,
  sort_order: i64,
  created_at: String,
  updated_at: String,
  last_opened_at: Option<String>,
  sources: Vec<WorkspaceSourceNodePayload>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct WorkspaceSourceNodePayload {
  id: String,
  workspace_id: String,
  parent_id: Option<String>,
  kind: String,
  name: String,
  path: String,
  enabled: bool,
  position: i64,
  children: Vec<WorkspaceSourceNodePayload>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceSaveInput {
  id: String,
  name: String,
  description: Option<String>,
  icon: Option<String>,
  color: Option<String>,
  default_search_scope: Option<String>,
  sort_order: Option<i64>,
  last_opened_at: Option<String>,
  sources: Option<Vec<WorkspaceSourceNodeInput>>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct WorkspaceSourceNodeInput {
  id: String,
  parent_id: Option<String>,
  kind: String,
  name: String,
  path: Option<String>,
  enabled: Option<bool>,
  position: Option<i64>,
  children: Option<Vec<WorkspaceSourceNodeInput>>,
}

#[derive(Debug, Clone)]
struct WorkspaceSourceNodeRow {
  id: String,
  workspace_id: String,
  parent_id: Option<String>,
  kind: String,
  name: String,
  path: String,
  enabled: bool,
  position: i64,
}

#[derive(Debug, Clone)]
struct WorkspaceSummaryRow {
  id: String,
  name: String,
  description: String,
  icon: String,
  color: String,
  default_search_scope: String,
  sort_order: i64,
  created_at: String,
  updated_at: String,
  last_opened_at: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SourcePathValidationPayload {
  exists: bool,
  is_directory: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct WorkspaceSourceDocumentPayload {
  source_node_id: String,
  source_root: String,
  absolute_path: String,
  relative_path: String,
  markdown: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct WorkspaceSourceStatusPayload {
  source_node_id: String,
  source_root: String,
  state: String,
  message: String,
  document_count: usize,
  used_cache: bool,
  checked_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct WorkspaceSourceScanPayload {
  documents: Vec<WorkspaceSourceDocumentPayload>,
  source_statuses: Vec<WorkspaceSourceStatusPayload>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CachedWorkspaceSourcePayload {
  documents: Vec<WorkspaceSourceDocumentPayload>,
}

#[derive(Debug, Clone)]
struct MarkdownFileSnapshot {
  absolute_path: PathBuf,
  relative_path: String,
  modified_at: u64,
  size: u64,
}

#[tauri::command]
fn list_workspace_details(app: AppHandle) -> Result<Vec<WorkspaceDetailPayload>, String> {
  let connection = open_workspace_database(&app)?;
  let mut statement = connection
    .prepare(
      r#"
      select
        id,
        name,
        description,
        icon,
        color,
        default_search_scope,
        sort_order,
        created_at,
        updated_at,
        last_opened_at
      from workspaces
      order by sort_order asc, name asc
      "#,
    )
    .map_err(|error| error.to_string())?;

  let rows = statement
    .query_map([], |row| {
      Ok(WorkspaceSummaryRow {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        icon: row.get(3)?,
        color: row.get(4)?,
        default_search_scope: row.get(5)?,
        sort_order: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
        last_opened_at: row.get(9)?,
      })
    })
    .map_err(|error| error.to_string())?;

  rows
    .collect::<Result<Vec<_>, _>>()
    .map_err(|error| error.to_string())?
    .into_iter()
    .map(|workspace| load_workspace_detail(&connection, workspace))
    .collect()
}

#[tauri::command]
fn upsert_workspace(app: AppHandle, input: WorkspaceSaveInput) -> Result<WorkspaceDetailPayload, String> {
  let mut connection = open_workspace_database(&app)?;
  let transaction = connection.transaction().map_err(|error| error.to_string())?;
  let now = current_timestamp();

  let created_at = transaction
    .query_row(
      "select created_at from workspaces where id = ?1",
      params![&input.id],
      |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|error| error.to_string())?
    .unwrap_or_else(|| now.clone());

  transaction
    .execute(
      r#"
      insert into workspaces (
        id,
        name,
        description,
        icon,
        color,
        default_search_scope,
        sort_order,
        created_at,
        updated_at,
        last_opened_at
      )
      values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
      on conflict(id) do update set
        name = excluded.name,
        description = excluded.description,
        icon = excluded.icon,
        color = excluded.color,
        default_search_scope = excluded.default_search_scope,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at,
        last_opened_at = excluded.last_opened_at
      "#,
      params![
        &input.id,
        &input.name,
        input.description.clone().unwrap_or_default(),
        input.icon.clone().unwrap_or_default(),
        input.color.clone().unwrap_or_else(|| "#1f54d9".to_string()),
        input.default_search_scope.clone().unwrap_or_else(|| "global".to_string()),
        input.sort_order.unwrap_or(0),
        created_at,
        now,
        input.last_opened_at.clone()
      ],
    )
    .map_err(|error| error.to_string())?;

  replace_workspace_source_nodes(&transaction, &input.id, input.sources.unwrap_or_default())?;
  transaction.commit().map_err(|error| error.to_string())?;

  let connection = open_workspace_database(&app)?;
  let summary = load_workspace_summary(&connection, &input.id)?;
  load_workspace_detail(&connection, summary)
}

#[tauri::command]
fn mark_workspace_opened(app: AppHandle, workspace_id: String) -> Result<Option<WorkspaceDetailPayload>, String> {
  let connection = open_workspace_database(&app)?;
  let now = current_timestamp();

  let updated = connection
    .execute(
      r#"
      update workspaces
      set
        updated_at = ?2,
        last_opened_at = ?2
      where id = ?1
      "#,
      params![&workspace_id, now],
    )
    .map_err(|error| error.to_string())?;

  if updated == 0 {
    return Ok(None);
  }

  let summary = load_workspace_summary(&connection, &workspace_id)?;
  load_workspace_detail(&connection, summary).map(Some)
}

#[tauri::command]
fn delete_workspace(app: AppHandle, workspace_id: String) -> Result<bool, String> {
  let mut connection = open_workspace_database(&app)?;
  let transaction = connection.transaction().map_err(|error| error.to_string())?;
  let workspace_count = transaction
    .query_row("select count(*) from workspaces", [], |row| row.get::<_, i64>(0))
    .map_err(|error| error.to_string())?;

  if workspace_count <= 1 {
    return Ok(false);
  }

  let deleted = transaction
    .execute("delete from workspaces where id = ?1", params![workspace_id])
    .map_err(|error| error.to_string())?;

  if deleted == 0 {
    return Ok(false);
  }

  transaction.commit().map_err(|error| error.to_string())?;
  Ok(true)
}

#[tauri::command]
fn pick_folder_path() -> Option<String> {
  rfd::FileDialog::new()
    .pick_folder()
    .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
fn validate_source_path(path: String) -> SourcePathValidationPayload {
  let metadata = std::fs::metadata(Path::new(&path));

  match metadata {
    Ok(metadata) => SourcePathValidationPayload {
      exists: true,
      is_directory: metadata.is_dir(),
    },
    Err(_) => SourcePathValidationPayload {
      exists: false,
      is_directory: false,
    },
  }
}

#[tauri::command]
fn scan_workspace_sources(
  app: AppHandle,
  sources: Vec<WorkspaceSourceNodeInput>,
) -> Result<WorkspaceSourceScanPayload, String> {
  let connection = open_workspace_database(&app)?;
  let mut documents = Vec::<WorkspaceSourceDocumentPayload>::new();
  let mut source_statuses = Vec::<WorkspaceSourceStatusPayload>::new();
  let folder_sources = collect_enabled_folder_sources(None, sources, true);

  for source in folder_sources {
    let checked_at = current_timestamp();
    match scan_single_source(&connection, &source, &checked_at) {
      Ok((source_documents, status)) => {
        documents.extend(source_documents);
        source_statuses.push(status);
      }
      Err(message) => {
        source_statuses.push(WorkspaceSourceStatusPayload {
          source_node_id: source.id.clone(),
          source_root: source.path.clone(),
          state: "error".to_string(),
          message,
          document_count: 0,
          used_cache: false,
          checked_at,
        });
      }
    }
  }

  Ok(WorkspaceSourceScanPayload {
    documents,
    source_statuses,
  })
}

#[tauri::command]
fn get_default_docs_path() -> Result<String, String> {
  Ok(resolve_default_docs_path())
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      delete_workspace,
      get_default_docs_path,
      list_workspace_details,
      mark_workspace_opened,
      pick_folder_path,
      scan_workspace_sources,
      validate_source_path,
      upsert_workspace
    ])
    .run(tauri::generate_context!())
    .expect("error while running Docs Atlas desktop application");
}

fn open_workspace_database(app: &AppHandle) -> Result<Connection, String> {
  let data_directory = app.path().app_data_dir().map_err(|error| error.to_string())?;
  std::fs::create_dir_all(&data_directory).map_err(|error| error.to_string())?;

  let database_path = data_directory.join("docs-atlas.db");
  let mut connection = Connection::open(database_path).map_err(|error| error.to_string())?;
  connection
    .execute_batch("pragma foreign_keys = on;")
    .map_err(|error| error.to_string())?;
  connection
    .execute_batch(WORKSPACE_DB_SCHEMA)
    .map_err(|error| error.to_string())?;
  migrate_workspace_database(&connection)?;
  maybe_migrate_legacy_seed_workspaces(&mut connection)?;
  Ok(connection)
}

fn migrate_workspace_database(connection: &Connection) -> Result<(), String> {
  add_column_if_missing(
    connection,
    "alter table workspaces add column default_search_scope text not null default 'global'",
  )?;
  add_column_if_missing(
    connection,
    "alter table workspaces add column sort_order integer not null default 0",
  )?;
  Ok(())
}

fn add_column_if_missing(connection: &Connection, statement: &str) -> Result<(), String> {
  match connection.execute(statement, []) {
    Ok(_) => Ok(()),
    Err(error) => {
      let message = error.to_string();
      if message.contains("duplicate column name") {
        Ok(())
      } else {
        Err(message)
      }
    }
  }
}

fn maybe_migrate_legacy_seed_workspaces(connection: &mut Connection) -> Result<(), String> {
  let saved_seed_version = read_app_setting_string(connection, DESKTOP_SEED_VERSION_KEY)?;
  if saved_seed_version.as_deref() == Some(CURRENT_DESKTOP_SEED_VERSION) {
    return Ok(());
  }

  if should_reset_legacy_seed_workspaces(connection)? {
    reset_to_default_workspace(connection)?;
  }

  write_app_setting_string(
    connection,
    DESKTOP_SEED_VERSION_KEY,
    CURRENT_DESKTOP_SEED_VERSION,
  )?;
  Ok(())
}

fn should_reset_legacy_seed_workspaces(connection: &Connection) -> Result<bool, String> {
  let workspaces = list_workspace_summaries(connection)?;
  if workspaces.is_empty() {
    return Ok(false);
  }

  if workspaces.len() == 1 && workspaces[0].id == "workspace:default" {
    let detail = load_workspace_detail(connection, workspaces[0].clone())?;
    return Ok(!matches_current_default_workspace(&detail, &resolve_default_docs_path()));
  }

  for workspace in workspaces {
    if is_legacy_workspace_id(&workspace.id) {
      continue;
    }

    let detail = load_workspace_detail(connection, workspace)?;
    if !detail
      .sources
      .iter()
      .any(|source| contains_legacy_seed_marker(source))
    {
      return Ok(false);
    }
  }

  Ok(true)
}

fn reset_to_default_workspace(connection: &mut Connection) -> Result<(), String> {
  let transaction = connection.transaction().map_err(|error| error.to_string())?;
  let now = current_timestamp();
  let default_docs_path = resolve_default_docs_path();

  transaction
    .execute("delete from workspace_source_nodes", [])
    .map_err(|error| error.to_string())?;
  transaction
    .execute("delete from recent_workspace_entries", [])
    .map_err(|error| error.to_string())?;
  transaction
    .execute("delete from workspaces", [])
    .map_err(|error| error.to_string())?;

  transaction
    .execute(
      r#"
      insert into workspaces (
        id,
        name,
        description,
        icon,
        color,
        default_search_scope,
        sort_order,
        created_at,
        updated_at,
        last_opened_at
      )
      values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
      "#,
      params![
        "workspace:default",
        "项目文档",
        "默认工作空间，指向当前项目的 docs 目录。",
        "folder",
        "#1f54d9",
        "workspace",
        0,
        now,
        now,
        now
      ],
    )
    .map_err(|error| error.to_string())?;

  replace_workspace_source_nodes(
    &transaction,
    "workspace:default",
    vec![WorkspaceSourceNodeInput {
      id: "node:project-docs".to_string(),
      parent_id: None,
      kind: "folder".to_string(),
      name: "项目文档".to_string(),
      path: Some(default_docs_path),
      enabled: Some(true),
      position: Some(0),
      children: Some(Vec::new()),
    }],
  )?;

  transaction.commit().map_err(|error| error.to_string())
}

fn list_workspace_summaries(connection: &Connection) -> Result<Vec<WorkspaceSummaryRow>, String> {
  let mut statement = connection
    .prepare(
      r#"
      select
        id,
        name,
        description,
        icon,
        color,
        default_search_scope,
        sort_order,
        created_at,
        updated_at,
        last_opened_at
      from workspaces
      order by sort_order asc, name asc
      "#,
    )
    .map_err(|error| error.to_string())?;

  let rows = statement
    .query_map([], |row| {
      Ok(WorkspaceSummaryRow {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        icon: row.get(3)?,
        color: row.get(4)?,
        default_search_scope: row.get(5)?,
        sort_order: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
        last_opened_at: row.get(9)?,
      })
    })
    .map_err(|error| error.to_string())?;

  rows
    .collect::<Result<Vec<_>, _>>()
    .map_err(|error| error.to_string())
}

fn matches_current_default_workspace(
  workspace: &WorkspaceDetailPayload,
  default_docs_path: &str,
) -> bool {
  if workspace.name != "项目文档" || workspace.sources.len() != 1 {
    return false;
  }

  let source = &workspace.sources[0];
  source.id == "node:project-docs"
    && source.kind == "folder"
    && source.name == "项目文档"
    && normalize_path(&source.path) == normalize_path(default_docs_path)
    && source.children.is_empty()
}

fn contains_legacy_seed_marker(source: &WorkspaceSourceNodePayload) -> bool {
  if is_legacy_source_id(&source.id)
    || matches!(source.name.as_str(), "AI-Agent" | "Another Project" | "Local Workspace")
  {
    return true;
  }

  let normalized_path = normalize_path(&source.path);
  if normalized_path.contains("config.yaml") || normalized_path.contains("config.yml") {
    return true;
  }

  source
    .children
    .iter()
    .any(|child| contains_legacy_seed_marker(child))
}

fn read_app_setting_string(connection: &Connection, key: &str) -> Result<Option<String>, String> {
  let raw_value = connection
    .query_row(
      "select value_json from app_settings where key = ?1",
      params![key],
      |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|error| error.to_string())?;

  match raw_value {
    Some(value) => serde_json::from_str::<String>(&value)
      .map(Some)
      .map_err(|error| error.to_string()),
    None => Ok(None),
  }
}

fn write_app_setting_string(connection: &Connection, key: &str, value: &str) -> Result<(), String> {
  let now = current_timestamp();
  let value_json = serde_json::to_string(value).map_err(|error| error.to_string())?;

  connection
    .execute(
      r#"
      insert into app_settings (key, value_json, updated_at)
      values (?1, ?2, ?3)
      on conflict(key) do update set
        value_json = excluded.value_json,
        updated_at = excluded.updated_at
      "#,
      params![key, value_json, now],
    )
    .map_err(|error| error.to_string())?;

  Ok(())
}

fn resolve_default_docs_path() -> String {
  let docs_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../docs");
  match docs_path.canonicalize() {
    Ok(path) => path.to_string_lossy().to_string(),
    Err(_) => docs_path.to_string_lossy().to_string(),
  }
}

fn normalize_path(value: &str) -> String {
  value.replace('\\', "/").trim().to_lowercase()
}

fn is_legacy_workspace_id(value: &str) -> bool {
  matches!(value, "workspace:atlas" | "workspace:product" | "workspace:ai")
}

fn is_legacy_source_id(value: &str) -> bool {
  matches!(value, "source:atlas" | "source:product" | "source:ai")
}

fn load_workspace_summary(connection: &Connection, workspace_id: &str) -> Result<WorkspaceSummaryRow, String> {
  connection
    .query_row(
      r#"
      select
        id,
        name,
        description,
        icon,
        color,
        default_search_scope,
        sort_order,
        created_at,
        updated_at,
        last_opened_at
      from workspaces
      where id = ?1
      "#,
      params![workspace_id],
      |row| {
        Ok(WorkspaceSummaryRow {
          id: row.get(0)?,
          name: row.get(1)?,
          description: row.get(2)?,
          icon: row.get(3)?,
          color: row.get(4)?,
          default_search_scope: row.get(5)?,
          sort_order: row.get(6)?,
          created_at: row.get(7)?,
          updated_at: row.get(8)?,
          last_opened_at: row.get(9)?,
        })
      },
    )
    .map_err(|error| error.to_string())
}

fn load_workspace_detail(
  connection: &Connection,
  workspace: WorkspaceSummaryRow,
) -> Result<WorkspaceDetailPayload, String> {
  let mut statement = connection
    .prepare(
      r#"
      select
        id,
        workspace_id,
        parent_id,
        kind,
        name,
        path,
        enabled,
        position
      from workspace_source_nodes
      where workspace_id = ?1
      order by position asc, name asc
      "#,
    )
    .map_err(|error| error.to_string())?;

  let rows = statement
    .query_map(params![workspace.id.clone()], |row| {
      Ok(WorkspaceSourceNodeRow {
        id: row.get(0)?,
        workspace_id: row.get(1)?,
        parent_id: row.get(2)?,
        kind: row.get(3)?,
        name: row.get(4)?,
        path: row.get(5)?,
        enabled: row.get::<_, i64>(6)? == 1,
        position: row.get(7)?,
      })
    })
    .map_err(|error| error.to_string())?;

  let sources = build_source_tree(
    rows.collect::<Result<Vec<_>, _>>()
      .map_err(|error| error.to_string())?,
  );

  Ok(WorkspaceDetailPayload {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    icon: workspace.icon,
    color: workspace.color,
    default_search_scope: workspace.default_search_scope,
    sort_order: workspace.sort_order,
    created_at: workspace.created_at,
    updated_at: workspace.updated_at,
    last_opened_at: workspace.last_opened_at,
    sources,
  })
}

fn replace_workspace_source_nodes(
  connection: &Connection,
  workspace_id: &str,
  nodes: Vec<WorkspaceSourceNodeInput>,
) -> Result<(), String> {
  connection
    .execute(
      "delete from workspace_source_nodes where workspace_id = ?1",
      params![workspace_id],
    )
    .map_err(|error| error.to_string())?;

  let flattened = flatten_source_nodes(workspace_id, None, nodes);
  let now = current_timestamp();

  for node in flattened {
    connection
      .execute(
        r#"
        insert into workspace_source_nodes (
          id,
          workspace_id,
          parent_id,
          kind,
          name,
          path,
          enabled,
          position,
          created_at,
          updated_at
        )
        values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
        "#,
        params![
          node.id,
          node.workspace_id,
          node.parent_id,
          node.kind,
          node.name,
          node.path,
          if node.enabled { 1 } else { 0 },
          node.position,
          now,
          now
        ],
      )
      .map_err(|error| error.to_string())?;
  }

  Ok(())
}

fn flatten_source_nodes(
  workspace_id: &str,
  parent_id: Option<String>,
  nodes: Vec<WorkspaceSourceNodeInput>,
) -> Vec<WorkspaceSourceNodeRow> {
  nodes
    .into_iter()
    .enumerate()
    .flat_map(|(index, node)| {
      let current = WorkspaceSourceNodeRow {
        id: node.id.clone(),
        workspace_id: workspace_id.to_string(),
        parent_id: node.parent_id.clone().or_else(|| parent_id.clone()),
        kind: node.kind.clone(),
        name: node.name.clone(),
        path: node.path.clone().unwrap_or_default(),
        enabled: node.enabled.unwrap_or(true),
        position: node.position.unwrap_or(index as i64),
      };

      let children = flatten_source_nodes(workspace_id, Some(node.id), node.children.unwrap_or_default());
      std::iter::once(current).chain(children.into_iter()).collect::<Vec<_>>()
    })
    .collect()
}

fn build_source_tree(rows: Vec<WorkspaceSourceNodeRow>) -> Vec<WorkspaceSourceNodePayload> {
  let by_parent = rows.iter().fold(
    std::collections::HashMap::<Option<String>, Vec<WorkspaceSourceNodeRow>>::new(),
    |mut groups, row| {
      groups.entry(row.parent_id.clone()).or_default().push(row.clone());
      groups
    },
  );

  let mut roots = build_source_children(None, &by_parent);
  sort_source_nodes(&mut roots);
  roots
}

fn build_source_children(
  parent_id: Option<String>,
  by_parent: &std::collections::HashMap<Option<String>, Vec<WorkspaceSourceNodeRow>>,
) -> Vec<WorkspaceSourceNodePayload> {
  by_parent
    .get(&parent_id)
    .cloned()
    .unwrap_or_default()
    .into_iter()
    .map(|row| WorkspaceSourceNodePayload {
      id: row.id.clone(),
      workspace_id: row.workspace_id.clone(),
      parent_id: row.parent_id.clone(),
      kind: row.kind.clone(),
      name: row.name.clone(),
      path: row.path.clone(),
      enabled: row.enabled,
      position: row.position,
      children: build_source_children(Some(row.id), by_parent),
    })
    .collect()
}

fn sort_source_nodes(nodes: &mut Vec<WorkspaceSourceNodePayload>) {
  nodes.sort_by(|left, right| {
    left.position
      .cmp(&right.position)
      .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
  });

  for node in nodes {
    sort_source_nodes(&mut node.children);
  }
}

fn current_timestamp() -> String {
  use std::time::{SystemTime, UNIX_EPOCH};

  match SystemTime::now().duration_since(UNIX_EPOCH) {
    Ok(duration) => format!("{}", duration.as_secs()),
    Err(_) => "0".to_string(),
  }
}

#[derive(Debug, Clone)]
struct EnabledFolderSource {
  id: String,
  path: String,
}

fn scan_single_source(
  connection: &Connection,
  source: &EnabledFolderSource,
  checked_at: &str,
) -> Result<(Vec<WorkspaceSourceDocumentPayload>, WorkspaceSourceStatusPayload), String> {
  let root = PathBuf::from(&source.path);
  let root_key = resolve_source_root_key(&root, &source.path);

  let metadata = match std::fs::metadata(&root) {
    Ok(metadata) => metadata,
    Err(_) => {
      return Ok((
        Vec::new(),
        WorkspaceSourceStatusPayload {
          source_node_id: source.id.clone(),
          source_root: source.path.clone(),
          state: "missing".to_string(),
          message: "目录不存在".to_string(),
          document_count: 0,
          used_cache: false,
          checked_at: checked_at.to_string(),
        },
      ));
    }
  };

  if !metadata.is_dir() {
    return Ok((
      Vec::new(),
      WorkspaceSourceStatusPayload {
        source_node_id: source.id.clone(),
        source_root: source.path.clone(),
        state: "not_directory".to_string(),
        message: "路径不是目录".to_string(),
        document_count: 0,
        used_cache: false,
        checked_at: checked_at.to_string(),
      },
    ));
  }

  let file_snapshots = collect_markdown_file_snapshots(&root, &root)?;
  if file_snapshots.is_empty() {
    return Ok((
      Vec::new(),
      WorkspaceSourceStatusPayload {
        source_node_id: source.id.clone(),
        source_root: source.path.clone(),
        state: "empty".to_string(),
        message: "目录下没有 Markdown 文档".to_string(),
        document_count: 0,
        used_cache: false,
        checked_at: checked_at.to_string(),
      },
    ));
  }

  let fingerprint = build_markdown_fingerprint(&file_snapshots);
  if let Some(cached_payload) = read_source_scan_cache(connection, &root_key, &fingerprint)? {
    let documents = cached_payload
      .documents
      .into_iter()
      .map(|document| WorkspaceSourceDocumentPayload {
        source_node_id: source.id.clone(),
        source_root: source.path.clone(),
        absolute_path: document.absolute_path,
        relative_path: document.relative_path,
        markdown: document.markdown,
      })
      .collect::<Vec<_>>();

    return Ok((
      documents.clone(),
      WorkspaceSourceStatusPayload {
        source_node_id: source.id.clone(),
        source_root: source.path.clone(),
        state: "ready".to_string(),
        message: format!("已加载 {} 篇文档（缓存）", documents.len()),
        document_count: documents.len(),
        used_cache: true,
        checked_at: checked_at.to_string(),
      },
    ));
  }

  let documents = file_snapshots
    .iter()
    .map(|snapshot| {
      let markdown = std::fs::read_to_string(&snapshot.absolute_path).map_err(|error| error.to_string())?;
      Ok(WorkspaceSourceDocumentPayload {
        source_node_id: source.id.clone(),
        source_root: source.path.clone(),
        absolute_path: snapshot.absolute_path.to_string_lossy().to_string(),
        relative_path: snapshot.relative_path.clone(),
        markdown,
      })
    })
    .collect::<Result<Vec<_>, String>>()?;

  write_source_scan_cache(
    connection,
    &root_key,
    &fingerprint,
    &CachedWorkspaceSourcePayload {
      documents: documents.clone(),
    },
  )?;

  Ok((
    documents.clone(),
    WorkspaceSourceStatusPayload {
      source_node_id: source.id.clone(),
      source_root: source.path.clone(),
      state: "ready".to_string(),
      message: format!("已扫描 {} 篇文档", documents.len()),
      document_count: documents.len(),
      used_cache: false,
      checked_at: checked_at.to_string(),
    },
  ))
}

fn collect_enabled_folder_sources(
  parent_enabled: Option<bool>,
  nodes: Vec<WorkspaceSourceNodeInput>,
  include_children: bool,
) -> Vec<EnabledFolderSource> {
  let mut sources = Vec::<EnabledFolderSource>::new();

  for node in nodes {
    let is_enabled = parent_enabled.unwrap_or(true) && node.enabled.unwrap_or(true);
    if !is_enabled {
      continue;
    }

    if node.kind == "folder" {
      let path = node.path.clone().unwrap_or_default();
      if !path.trim().is_empty() {
        sources.push(EnabledFolderSource {
          id: node.id.clone(),
          path,
        });
      }
    }

    if include_children {
      sources.extend(collect_enabled_folder_sources(
        Some(is_enabled),
        node.children.unwrap_or_default(),
        true,
      ));
    }
  }

  sources
}

fn collect_markdown_file_snapshots(root: &Path, base_root: &Path) -> Result<Vec<MarkdownFileSnapshot>, String> {
  let mut files = Vec::<MarkdownFileSnapshot>::new();
  let entries = std::fs::read_dir(root).map_err(|error| error.to_string())?;

  for entry in entries {
    let entry = entry.map_err(|error| error.to_string())?;
    let path = entry.path();
    let file_type = entry.file_type().map_err(|error| error.to_string())?;

    if file_type.is_dir() {
      files.extend(collect_markdown_file_snapshots(&path, base_root)?);
      continue;
    }

    if file_type.is_file() && is_markdown_file(&path) {
      let relative_path = path
        .strip_prefix(base_root)
        .map_err(|error| error.to_string())?
        .to_string_lossy()
        .replace('\\', "/");
      let metadata = entry.metadata().map_err(|error| error.to_string())?;
      let modified_at = metadata
        .modified()
        .ok()
        .and_then(|value| value.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|value| value.as_secs())
        .unwrap_or(0);

      files.push(MarkdownFileSnapshot {
        absolute_path: path,
        relative_path,
        modified_at,
        size: metadata.len(),
      });
    }
  }

  files.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));

  Ok(files)
}

fn is_markdown_file(path: &Path) -> bool {
  path.extension()
    .and_then(|value| value.to_str())
    .map(|value| value.eq_ignore_ascii_case("md"))
    .unwrap_or(false)
}

fn build_markdown_fingerprint(files: &[MarkdownFileSnapshot]) -> String {
  let mut hasher = DefaultHasher::new();
  files.len().hash(&mut hasher);

  for file in files {
    file.relative_path.hash(&mut hasher);
    file.modified_at.hash(&mut hasher);
    file.size.hash(&mut hasher);
  }

  format!("{:016x}", hasher.finish())
}

fn resolve_source_root_key(root: &Path, fallback: &str) -> String {
  root
    .canonicalize()
    .map(|value| value.to_string_lossy().to_string())
    .unwrap_or_else(|_| fallback.to_string())
}

fn read_source_scan_cache(
  connection: &Connection,
  source_root: &str,
  fingerprint: &str,
) -> Result<Option<CachedWorkspaceSourcePayload>, String> {
  let raw_payload = connection
    .query_row(
      r#"
      select payload_json
      from workspace_source_scan_cache
      where source_root = ?1 and fingerprint = ?2
      "#,
      params![source_root, fingerprint],
      |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|error| error.to_string())?;

  match raw_payload {
    Some(payload) => serde_json::from_str::<CachedWorkspaceSourcePayload>(&payload)
      .map(Some)
      .map_err(|error| error.to_string()),
    None => Ok(None),
  }
}

fn write_source_scan_cache(
  connection: &Connection,
  source_root: &str,
  fingerprint: &str,
  payload: &CachedWorkspaceSourcePayload,
) -> Result<(), String> {
  let payload_json = serde_json::to_string(payload).map_err(|error| error.to_string())?;
  let now = current_timestamp();

  connection
    .execute(
      r#"
      insert into workspace_source_scan_cache (source_root, fingerprint, payload_json, updated_at)
      values (?1, ?2, ?3, ?4)
      on conflict(source_root) do update set
        fingerprint = excluded.fingerprint,
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at
      "#,
      params![source_root, fingerprint, payload_json, now],
    )
    .map_err(|error| error.to_string())?;

  Ok(())
}
