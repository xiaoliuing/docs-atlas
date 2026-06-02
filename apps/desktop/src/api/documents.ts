import { invoke } from '@tauri-apps/api/core'

export async function saveMarkdownDocument(path: string, markdown: string): Promise<boolean> {
  if (!isTauriRuntime()) {
    return false
  }

  return invoke<boolean>('save_markdown_document', { path, markdown })
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
