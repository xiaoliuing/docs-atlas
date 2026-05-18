import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { WORKSPACE_DB_SCHEMA } from './schema'

export function createWorkspaceDatabase(databasePath: string): DatabaseSync {
  ensureDirectory(path.dirname(databasePath))
  const database = new DatabaseSync(databasePath)
  database.exec('pragma foreign_keys = on;')
  database.exec(WORKSPACE_DB_SCHEMA)
  return database
}

function ensureDirectory(directoryPath: string) {
  fs.mkdirSync(directoryPath, { recursive: true })
}
