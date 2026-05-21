import type { WorkspaceDetail } from '@docs-atlas/shared-types/workspace'

export function createDefaultWorkspaces(defaultDocsPath: string): WorkspaceDetail[] {
  const now = '2026-05-18T09:30:00.000Z'

  return [
    {
      id: 'workspace:default',
      name: '项目文档',
      description: '默认文档仓库，指向当前项目的 docs 目录。',
      icon: 'folder',
      color: '#1f54d9',
      defaultSearchScope: 'workspace',
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      sources: [
        {
          id: 'node:project-docs',
          workspaceId: 'workspace:default',
          parentId: null,
          kind: 'folder',
          name: '项目文档',
          path: defaultDocsPath,
          enabled: true,
          position: 0,
          children: [],
        },
      ],
    },
  ]
}

export const browserDefaultWorkspaces = createDefaultWorkspaces('./docs')
