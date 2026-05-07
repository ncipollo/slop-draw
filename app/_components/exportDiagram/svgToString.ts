const CONTENT_PADDING = 16

// Finds the first shape element (rect/ellipse/polygon/circle) in a group,
// checking direct children and one level of unwrapped child groups (for ActorBox pattern).
function findFirstShape(g: Element): Element | null {
  for (const child of Array.from(g.children)) {
    const tag = child.tagName.toLowerCase()
    if (['rect', 'ellipse', 'polygon', 'circle'].includes(tag)) return child
    if (tag === 'g' && !child.getAttribute('transform')) {
      for (const grandchild of Array.from(child.children)) {
        if (['rect', 'ellipse', 'polygon', 'circle'].includes(grandchild.tagName.toLowerCase())) {
          return grandchild
        }
      }
    }
  }
  return null
}

type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

function expandBoundsForRect(b: Bounds, tx: number, ty: number, shape: Element): void {
  const w = parseFloat(shape.getAttribute('width') ?? '0')
  const h = parseFloat(shape.getAttribute('height') ?? '0')
  if (w <= 0 || h <= 0) return
  b.minX = Math.min(b.minX, tx)
  b.minY = Math.min(b.minY, ty)
  b.maxX = Math.max(b.maxX, tx + w)
  b.maxY = Math.max(b.maxY, ty + h)
}

function expandBoundsForEllipse(b: Bounds, tx: number, ty: number, shape: Element): void {
  const rx = parseFloat(shape.getAttribute('rx') ?? '0')
  const ry = parseFloat(shape.getAttribute('ry') ?? '0')
  const cx = parseFloat(shape.getAttribute('cx') ?? '0')
  const cy = parseFloat(shape.getAttribute('cy') ?? '0')
  if (rx <= 0) return
  b.minX = Math.min(b.minX, tx + cx - rx)
  b.minY = Math.min(b.minY, ty + cy - ry)
  b.maxX = Math.max(b.maxX, tx + cx + rx)
  b.maxY = Math.max(b.maxY, ty + cy + ry)
}

function expandBoundsForPolygon(b: Bounds, tx: number, ty: number, shape: Element): void {
  const pts = (shape.getAttribute('points') ?? '').trim().split(/[\s,]+/).map(Number)
  for (let i = 0; i + 1 < pts.length; i += 2) {
    b.minX = Math.min(b.minX, tx + pts[i])
    b.minY = Math.min(b.minY, ty + pts[i + 1])
    b.maxX = Math.max(b.maxX, tx + pts[i])
    b.maxY = Math.max(b.maxY, ty + pts[i + 1])
  }
}

function expandBoundsForShape(b: Bounds, tx: number, ty: number, shape: Element): void {
  const tag = shape.tagName.toLowerCase()
  if (tag === 'rect') expandBoundsForRect(b, tx, ty, shape)
  else if (tag === 'ellipse') expandBoundsForEllipse(b, tx, ty, shape)
  else if (tag === 'polygon') expandBoundsForPolygon(b, tx, ty, shape)
}

// Computes a viewBox that encompasses all node/actor positions, including nodes
// that have been dragged outside the original Mermaid-generated viewBox.
function computeContentViewBox(svg: SVGSVGElement): string {
  const b: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }

  svg.querySelectorAll('g[transform]').forEach((g) => {
    if (g.closest('defs') || g.closest('marker')) return
    const t = g.getAttribute('transform') ?? ''
    const m = t.match(/translate\(\s*([-\d.]+)[,\s]+\s*([-\d.]+)\s*\)/)
    if (!m) return
    const shape = findFirstShape(g)
    if (shape) expandBoundsForShape(b, parseFloat(m[1]), parseFloat(m[2]), shape)
  })

  if (!isFinite(b.minX)) return svg.getAttribute('viewBox') ?? '0 0 800 600'
  const p = CONTENT_PADDING
  return `${b.minX - p} ${b.minY - p} ${b.maxX - b.minX + p * 2} ${b.maxY - b.minY + p * 2}`
}

function resolveCssVars(str: string): string {
  const rootStyle = getComputedStyle(document.documentElement)
  const lineColor = rootStyle.getPropertyValue('--line-color').trim() || '#000000'
  const background = rootStyle.getPropertyValue('--background').trim() || '#ffffff'
  const foreground = rootStyle.getPropertyValue('--foreground').trim() || '#171717'
  return str
    .replaceAll('var(--line-color)', lineColor)
    .replaceAll('var(--background)', background)
    .replaceAll('var(--foreground)', foreground)
}

function inlineEdgeStyles(clone: SVGSVGElement, original: SVGSVGElement): void {
  const cloneEdges = clone.querySelectorAll('path, line, polyline')
  const origEdges = original.querySelectorAll('path, line, polyline')
  cloneEdges.forEach((cloneEl, i) => {
    const origEl = origEdges[i]
    if (!origEl) return
    if (origEl.closest('defs')) return
    const cs = getComputedStyle(origEl)
    const el = cloneEl as SVGElement
    if (cs.stroke && cs.stroke !== 'none') el.style.stroke = cs.stroke
    if (cs.strokeWidth) el.style.strokeWidth = cs.strokeWidth
  })
}

// Inline fill/stroke from computed styles onto CSS-module-styled shapes.
// We only touch rect/polygon/ellipse/circle (never path or line) so we
// don't accidentally fill edge paths. We skip defs and explicit fill="none".
function inlineShapeStyles(clone: SVGSVGElement, original: SVGSVGElement): void {
  const cloneShapes = clone.querySelectorAll('rect, polygon, ellipse, circle')
  const origShapes = original.querySelectorAll('rect, polygon, ellipse, circle')
  cloneShapes.forEach((cloneEl, i) => {
    const origEl = origShapes[i]
    if (!origEl) return
    if (origEl.closest('defs')) return
    if (origEl.getAttribute('fill') === 'none') return
    const cs = getComputedStyle(origEl)
    const el = cloneEl as SVGElement
    if (cs.fill && cs.fill !== 'none') el.style.fill = cs.fill
    if (cs.stroke && cs.stroke !== 'none') el.style.stroke = cs.stroke
    if (cs.strokeWidth) el.style.strokeWidth = cs.strokeWidth
  })
}

function replaceForeignObjects(clone: SVGSVGElement): void {
  clone.querySelectorAll('foreignObject').forEach((fo) => {
    const w = parseFloat(fo.getAttribute('width') ?? '0')
    const h = parseFloat(fo.getAttribute('height') ?? '0')
    const text = fo.textContent?.trim() ?? ''
    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    textEl.setAttribute('x', String(w / 2))
    textEl.setAttribute('y', String(h / 2))
    textEl.setAttribute('text-anchor', 'middle')
    textEl.setAttribute('dominant-baseline', 'middle')
    textEl.setAttribute('font-size', '14')
    textEl.setAttribute('font-family', 'Arial, Helvetica, sans-serif')
    textEl.setAttribute('fill', 'var(--foreground)')
    textEl.textContent = text
    fo.replaceWith(textEl)
  })
}

export function svgToString(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  if (!clone.getAttribute('xmlns:xlink'))
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

  // Compute content bounds from actual element positions (handles nodes moved outside original viewBox)
  const viewBox = computeContentViewBox(svg)
  const vbParts = viewBox.trim().split(/\s+/).map(Number)
  clone.setAttribute('viewBox', viewBox)
  clone.setAttribute('width', String(vbParts[2]))
  clone.setAttribute('height', String(vbParts[3]))

  // Remove percentage dimensions so viewBox + explicit attrs control intrinsic size
  clone.style.removeProperty('width')
  clone.style.removeProperty('height')

  // Inline fill/stroke for CSS-module-styled shapes (before inserting bgRect to keep indices aligned)
  inlineShapeStyles(clone, svg)
  inlineEdgeStyles(clone, svg)

  // Replace foreignObject HTML (causes canvas taint in WKWebView) with SVG text
  replaceForeignObjects(clone)

  // Resolve CSS variable references left in SVG presentation attributes
  const raw = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone)
  return resolveCssVars(raw)
}
