import { svgToString } from './svgToString'

const PNG_SCALE = 2

export async function captureElementAsPng(element: HTMLElement): Promise<Uint8Array> {
  const svg = element.querySelector('svg') as SVGSVGElement | null
  if (!svg) return new Uint8Array()
  const svgString = svgToString(svg)
  const { width, height } = parseSvgDimensions(svgString)
  const img = await loadSvgAsImage(svgString)
  return renderToPng(img, width, height)
}

// Reads width/height from the root <svg> element's attributes in the serialized string.
// svgToString always sets explicit pixel width/height, so this is the authoritative size.
function parseSvgDimensions(svgString: string): { width: number; height: number } {
  const wMatch = svgString.match(/<svg[^>]*\swidth="([\d.]+)"/)
  const hMatch = svgString.match(/<svg[^>]*\sheight="([\d.]+)"/)
  const w = wMatch ? parseFloat(wMatch[1]) : 0
  const h = hMatch ? parseFloat(hMatch[1]) : 0
  if (w > 0 && h > 0) return { width: w, height: h }

  const vbMatch = svgString.match(/viewBox="([-\d.\s]+)"/)
  if (vbMatch) {
    const parts = vbMatch[1].trim().split(/\s+/).map(Number)
    if (parts[2] > 0 && parts[3] > 0) return { width: parts[2], height: parts[3] }
  }
  return { width: 400, height: 300 }
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
