import { save } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { FILTERS } from './constants'
import { chooseExporter } from './chooseExporter'
import { captureElementAsPng } from './captureElementAsPng'

export async function exportDiagram(container: HTMLElement | null): Promise<void> {
  if (!container) return

  const filePath = await save({ title: 'Export diagram', filters: FILTERS })
  if (!filePath) return

  const ext = filePath.toLowerCase().split('.').pop()

  if (ext === 'svg' || ext === 'html' || ext === 'htm') {
    const svg = container.querySelector('svg') as SVGSVGElement | null
    if (!svg) return
    const exporter = chooseExporter(filePath, svg)
    const bytes = await exporter.encode()
    await invoke('write_file_bytes', { path: exporter.filePath, contents: Array.from(bytes) })
    return
  }

  const resolvedPath = ext === 'png' ? filePath : filePath + '.png'
  const bytes = await captureElementAsPng(container)
  await invoke('write_file_bytes', { path: resolvedPath, contents: Array.from(bytes) })
}
