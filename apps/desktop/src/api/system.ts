import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

const DESKTOP_MENU_ACTION_EVENT = 'desktop-menu-action'

export type DesktopMenuAction = 'open-search' | 'open-settings' | 'import-workspace' | 'export-workspace'

type DesktopMenuActionPayload = {
  action: DesktopMenuAction
}

export async function openAppDataDirectory(): Promise<boolean> {
  if (!isTauriRuntime()) {
    return false
  }

  return invoke<boolean>('open_app_data_directory')
}

export async function openLogsDirectory(): Promise<boolean> {
  if (!isTauriRuntime()) {
    return false
  }

  return invoke<boolean>('open_logs_directory')
}

export async function exportLogsFile(): Promise<boolean> {
  if (!isTauriRuntime()) {
    return false
  }

  return invoke<boolean>('export_logs_file')
}

export async function listenDesktopMenuActions(
  handler: (action: DesktopMenuAction) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return () => {}
  }

  return listen<DesktopMenuActionPayload>(DESKTOP_MENU_ACTION_EVENT, (event) => {
    handler(event.payload.action)
  })
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
