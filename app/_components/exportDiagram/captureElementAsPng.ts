import { svgToString } from './svgToString'

const PNG_SCALE = 2

export async function captureElementAsPng(element: HTMLElement): Promise<Uint8Array> {
  const svg = element.querySelector('svg') as SVGSVGElement | null
  if (!svg) return new Uint8Array()
  const { width, height } = getSvgSize(svg)
  const img = await loadSvgAsImage(svgToString(svg))
  return renderToPng(img, width, height)
}

function getSvgSize(svg: SVGSVGElement): { width: number; height: number } {
  const w = parseFloat(svg.getAttribute('width') ?? '')
  const h = parseFloat(svg.getAttribute('height') ?? '')
  if (w > 0 && h > 0) return { width: w, height: h }

  const vb = svg.getAttribute('viewBox')
  if (vb) {
    const parts = vb.trim().split(/\s+|,/).map(Number)
    if (parts[2] > 0 && parts[3] > 0) return { width: parts[2], height: parts[3] }
  }

  const rect = svg.getBoundingClientRect()
  return { width: rect.width || 400, height: rect.height || 300 }
}

function loadSvgAsImage(svgString: string): Promise<HTMLImageElement> {
  // Use a data URL instead of a blob URL so there is nothing to revoke before drawImage.
  // Revoking a blob URL before drawImage causes a blank canvas in WKWebView.
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString)
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

async function renderToPng(img: HTMLImageElement, width: number, height: number): Promise<Uint8Array> {
  const canvas = document.createElement('canvas')
  canvas.width = width * PNG_SCALE
  canvas.height = height * PNG_SCALE
  const ctx = canvas.getContext('2d')!
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--background').trim() || '#ffffff'
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  )
  return new Uint8Array(await blob.arrayBuffer())
}
