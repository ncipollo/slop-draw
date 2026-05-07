import { save } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { FILTERS } from './constants'
import { chooseExporter } from './chooseExporter'

export async function exportDiagram(svg: SVGSVGElement | null): Promise<void> {
  if (!svg) return

  const filePath = await save({ title: 'Export diagram', filters: FILTERS })
  if (!filePath) return

  const exporter = chooseExporter(filePath, svg)
  const bytes = await exporter.encode()

  await invoke('write_file_bytes', { path: exporter.filePath, contents: Array.from(bytes) })
}
