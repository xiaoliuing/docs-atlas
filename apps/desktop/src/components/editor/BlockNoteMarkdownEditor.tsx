import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { BlockNoteView } from '@blocknote/mantine'
import { useCreateBlockNote } from '@blocknote/react'
import { useEffect, useRef } from 'react'

export type BlockNoteMarkdownEditorProps = {
  editable: boolean
  markdown: string
  theme: 'dark' | 'light'
  onChange: (markdown: string) => void
  onReady?: () => void
}

export function BlockNoteMarkdownEditor(props: BlockNoteMarkdownEditorProps) {
  const editor = useCreateBlockNote()
  const isApplyingExternalMarkdownRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function loadMarkdown() {
      isApplyingExternalMarkdownRef.current = true
      const blocks = await editor.tryParseMarkdownToBlocks(props.markdown || '')
      if (cancelled) {
        return
      }

      editor.replaceBlocks(editor.document, blocks)
      isApplyingExternalMarkdownRef.current = false
      props.onReady?.()
    }

    void loadMarkdown()

    return () => {
      cancelled = true
      isApplyingExternalMarkdownRef.current = false
    }
  }, [editor, props.markdown])

  async function handleChange() {
    if (isApplyingExternalMarkdownRef.current) {
      return
    }

    const markdown = await editor.blocksToMarkdownLossy(editor.document)
    props.onChange(markdown)
  }

  return (
    <BlockNoteView
      className="docs-atlas-blocknote-editor"
      editable={props.editable}
      editor={editor}
      theme={props.theme}
      onChange={handleChange}
    />
  )
}
