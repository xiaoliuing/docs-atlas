import type { DatabaseSync } from 'node:sqlite'
import type {
  WorkspaceDetail,
  WorkspaceRecord,
  WorkspaceSourceNode,
  WorkspaceSourceNodeInput,
  WorkspaceSourceNodeRecord,
  WorkspaceUpsertInput,
} from '@docs-atlas/shared-types/workspace'

type WorkspaceSourceNodeRow = Omit<WorkspaceSourceNodeRecord, 'enabled'> & {
  enabled: number
}

export class WorkspaceRepository {
  constructor(private readonly database: DatabaseSync) {}

  listWorkspaces(): WorkspaceRecord[] {
    const statement = this.database.prepare(`
      select
        id,
        name,
        description,
        icon,
        color,
        created_at as createdAt,
        updated_at as updatedAt,
        last_opened_at as lastOpenedAt
      from workspaces
      order by coalesce(last_opened_at, updated_at) desc, name asc
    `)

    return statement.all() as WorkspaceRecord[]
  }

  getWorkspaceById(workspaceId: string): WorkspaceDetail | null {
    const workspaceStatement = this.database.prepare(`
      select
        id,
        name,
        description,
        icon,
        color,
        created_at as createdAt,
        updated_at as updatedAt,
        last_opened_at as lastOpenedAt
      from workspaces
      where id = ?
    `)
    const workspace = workspaceStatement.get(workspaceId) as WorkspaceRecord | undefined
    if (!workspace) {
      return null
    }

    const sourceStatement = this.database.prepare(`
      select
        id,
        workspace_id as workspaceId,
        parent_id as parentId,
        kind,
        name,
        path,
        enabled,
        position
      from workspace_source_nodes
      where workspace_id = ?
      order by position asc, name asc
    `)

    const sourceRecords = sourceStatement.all(workspaceId) as WorkspaceSourceNodeRow[]

    return {
      ...workspace,
      sources: buildSourceTree(
        sourceRecords.map<WorkspaceSourceNodeRecord>((record) => ({
          ...record,
          enabled: Boolean(record.enabled),
        })),
      ),
    }
  }

  upsertWorkspace(input: WorkspaceUpsertInput): WorkspaceRecord {
    const now = new Date().toISOString()
    const selectStatement = this.database.prepare(`
      select created_at as createdAt
      from workspaces
      where id = ?
    `)
    const existing = selectStatement.get(input.id) as { createdAt: string } | undefined
    const createdAt = existing?.createdAt ?? now

    const upsertStatement = this.database.prepare(`
      insert into workspaces (
        id,
        name,
        description,
        icon,
        color,
        created_at,
        updated_at,
        last_opened_at
      )
      values (?, ?, ?, ?, ?, ?, ?, ?)
      on conflict(id) do update set
        name = excluded.name,
        description = excluded.description,
        icon = excluded.icon,
        color = excluded.color,
        updated_at = excluded.updated_at,
        last_opened_at = excluded.last_opened_at
    `)

    upsertStatement.run(
      input.id,
      input.name,
      input.description ?? '',
      input.icon ?? '',
      input.color ?? '#1f54d9',
      createdAt,
      now,
      input.lastOpenedAt ?? null,
    )

    return {
      id: input.id,
      name: input.name,
      description: input.description ?? '',
      icon: input.icon ?? '',
      color: input.color ?? '#1f54d9',
      createdAt,
      updatedAt: now,
      lastOpenedAt: input.lastOpenedAt ?? null,
    }
  }

  replaceWorkspaceSourceNodes(workspaceId: string, nodes: WorkspaceSourceNodeInput[]) {
    const now = new Date().toISOString()
    const deleteStatement = this.database.prepare(`
      delete from workspace_source_nodes
      where workspace_id = ?
    `)
    deleteStatement.run(workspaceId)

    const insertStatement = this.database.prepare(`
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
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const flattened = flattenSourceNodes(workspaceId, nodes)
    for (const node of flattened) {
      insertStatement.run(
        node.id,
        workspaceId,
        node.parentId,
        node.kind,
        node.name,
        node.path,
        node.enabled ? 1 : 0,
        node.position,
        now,
        now,
      )
    }
  }
}

function flattenSourceNodes(
  workspaceId: string,
  nodes: WorkspaceSourceNodeInput[],
  parentId: string | null = null,
): WorkspaceSourceNodeRecord[] {
  return nodes.flatMap((node, index) => {
    const current: WorkspaceSourceNodeRecord = {
      id: node.id,
      workspaceId,
      parentId: node.parentId ?? parentId,
      kind: node.kind,
      name: node.name,
      path: node.path ?? '',
      enabled: node.enabled ?? true,
      position: node.position ?? index,
    }

    return [
      current,
      ...flattenSourceNodes(workspaceId, node.children ?? [], current.id),
    ]
  })
}

function buildSourceTree(records: WorkspaceSourceNodeRecord[]): WorkspaceSourceNode[] {
  const byId = new Map<string, WorkspaceSourceNode>()
  const roots: WorkspaceSourceNode[] = []

  for (const record of records) {
    byId.set(record.id, {
      ...record,
      children: [],
    })
  }

  for (const record of records) {
    const node = byId.get(record.id)
    if (!node) {
      continue
    }

    if (!record.parentId) {
      roots.push(node)
      continue
    }

    const parent = byId.get(record.parentId)
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}
