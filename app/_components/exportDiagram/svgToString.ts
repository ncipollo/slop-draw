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
    textEl.textContent = text
    fo.replaceWith(textEl)
  })
}

export function svgToString(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  if (!clone.getAttribute('xmlns:xlink'))
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

  // Remove percentage dimensions so viewBox controls intrinsic size in standalone SVG images
  clone.style.removeProperty('width')
  clone.style.removeProperty('height')

  // Inline fill/stroke for CSS-module-styled shapes (node boxes, actor boxes)
  inlineShapeStyles(clone, svg)
  inlineEdgeStyles(clone, svg)

  // Replace foreignObject HTML (causes canvas taint in WKWebView) with SVG text
  replaceForeignObjects(clone)

  // Resolve CSS variable references left in SVG presentation attributes
  const raw = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone)
  return resolveCssVars(raw)
}
