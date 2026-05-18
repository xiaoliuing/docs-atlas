import { invoke } from '@tauri-apps/api/core'

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

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
