import { save } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'

const FILTERS = [
  { name: 'PNG image', extensions: ['png'] },
  { name: 'SVG image', extensions: ['svg'] },
  { name: 'HTML document', extensions: ['html'] },
]

function getSvgPixelSize(svg: SVGSVGElement): { width: number; height: number } {
  const w = parseFloat(svg.getAttribute('width') ?? '')
  const h = parseFloat(svg.getAttribute('height') ?? '')
  if (!isNaN(w) && w > 0 && !isNaN(h) && h > 0) return { width: w, height: h }

  const vb = svg.getAttribute('viewBox')
  if (vb) {
    const parts = vb.trim().split(/\s+|,/)
    const vw = parseFloat(parts[2])
    const vh = parseFloat(parts[3])
    if (!isNaN(vw) && vw > 0 && !isNaN(vh) && vh > 0) return { width: vw, height: vh }
  }

  const rect = svg.getBoundingClientRect()
  return { width: rect.width || 400, height: rect.height || 300 }
}

function svgToString(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  if (!clone.getAttribute('xmlns:xlink'))
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone)
}

async function svgToPng(svgString: string, width: number, height: number): Promise<Uint8Array> {
  const scale = 2
  // External fonts/CSS vars are not inlined — Mermaid inline styles are sufficient for v1.
  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
    })
    return new Uint8Array(await pngBlob.arrayBuffer())
  } finally {
    URL.revokeObjectURL(url)
  }
}

function svgToHtml(svgString: string, title: string): Uint8Array {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>body{margin:0;padding:24px;display:flex;justify-content:center;font-family:system-ui}</style>
</head>
<body>${svgString}</body>
</html>`
  return new TextEncoder().encode(html)
}

export async function exportDiagram(svg: SVGSVGElement | null): Promise<void> {
  if (!svg) return

  let filePath = await save({ title: 'Export diagram', filters: FILTERS })
  if (!filePath) return

  const ext = filePath.toLowerCase().split('.').pop()

  let bytes: Uint8Array
  if (ext === 'svg') {
    bytes = new TextEncoder().encode(svgToString(svg))
  } else if (ext === 'html') {
    const stem = filePath.split('/').pop()!.replace(/\.html?$/i, '')
    bytes = svgToHtml(svgToString(svg), stem)
  } else {
    // default to PNG for unknown/missing extension
    if (ext !== 'png') filePath = filePath + '.png'
    const { width, height } = getSvgPixelSize(svg)
    bytes = await svgToPng(svgToString(svg), width, height)
  }

  await invoke('write_file_bytes', { path: filePath, contents: Array.from(bytes) })
}
