import { FALLBACK_HEIGHT, FALLBACK_WIDTH } from './constants'

export function getSvgPixelSize(svg: SVGSVGElement): { width: number; height: number } {
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
  return { width: rect.width || FALLBACK_WIDTH, height: rect.height || FALLBACK_HEIGHT }
}
