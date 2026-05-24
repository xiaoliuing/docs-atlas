import { invoke } from '@tauri-apps/api/core'

export type MarkdownDocumentFile = {
  absolutePath: string
  markdown: string
  updatedAt: string
}

export async function readMarkdownDocumentFile(absolutePath: string): Promise<MarkdownDocumentFile> {
  if (isTauriRuntime()) {
    return invoke<MarkdownDocumentFile>('read_markdown_document_file', { absolutePath })
  }

  return {
    absolutePath,
    markdown: '',
    updatedAt: String(Math.floor(Date.now() / 1000)),
  }
}

export async function writeMarkdownDocumentFile(
  absolutePath: string,
  markdown: string,
): Promise<MarkdownDocumentFile> {
  if (isTauriRuntime()) {
    return invoke<MarkdownDocumentFile>('write_markdown_document_file', { absolutePath, markdown })
  }

  return {
    absolutePath,
    markdown,
    updatedAt: String(Math.floor(Date.now() / 1000)),
  }
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
