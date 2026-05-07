import type { DiagramEdge, DiagramGraph, DiagramNode, NodeShape } from './graph'

function detectShape(nodeEl: Element): NodeShape {
  if (nodeEl.querySelector('polygon')) return 'diamond'
  if (nodeEl.querySelector('ellipse')) return 'ellipse'
  const rect = nodeEl.querySelector('rect')
  if (rect) {
    const w = parseFloat(rect.getAttribute('width') ?? '0')
    const h = parseFloat(rect.getAttribute('height') ?? '0')
    if (w > 0 && h > 0) {
      const rx = rect.getAttribute('rx')
      if (rx && parseFloat(rx) > 4) return 'roundRect'
      return 'rect'
    }
  }
  // Mermaid v11 stadium ([...]) uses a <path> with no rect/ellipse/polygon.
  if (nodeEl.querySelector('path')) return 'stadium'
  return 'rect'
}

function extractLabel(nodeEl: Element): string {
  const fo = nodeEl.querySelector('foreignObject')
  if (fo) return (fo.textContent ?? '').trim()
  const span = nodeEl.querySelector('span')
  if (span) return (span.textContent ?? '').trim()
  return (nodeEl.textContent ?? '').trim()
}

type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

function expandRectBounds(b: Bounds, el: Element): void {
  const w = parseFloat(el.getAttribute('width') ?? '0')
  const h = parseFloat(el.getAttribute('height') ?? '0')
  // Skip placeholder rects that have no dimensions (e.g. the empty <rect> Mermaid
  // places inside every label <g> as a tap-target stub).
  if (w <= 0 || h <= 0) return
  const x = parseFloat(el.getAttribute('x') ?? '0')
  const y = parseFloat(el.getAttribute('y') ?? '0')
  b.minX = Math.min(b.minX, x)
  b.minY = Math.min(b.minY, y)
  b.maxX = Math.max(b.maxX, x + w)
  b.maxY = Math.max(b.maxY, y + h)
}

function expandEllipseBounds(b: Bounds, el: Element): void {
  const cx = parseFloat(el.getAttribute('cx') ?? '0')
  const cy = parseFloat(el.getAttribute('cy') ?? '0')
  const rx = parseFloat(el.getAttribute('rx') ?? '0')
  const ry = parseFloat(el.getAttribute('ry') ?? '0')
  b.minX = Math.min(b.minX, cx - rx)
  b.minY = Math.min(b.minY, cy - ry)
  b.maxX = Math.max(b.maxX, cx + rx)
  b.maxY = Math.max(b.maxY, cy + ry)
}

function expandPolygonBounds(b: Bounds, el: Element): void {
  // Mermaid v11 diamond polygons carry their own translate transform.
  const { tx: etx, ty: ety } = getTranslate(el)
  const pts = (el.getAttribute('points') ?? '').trim().split(/[\s,]+/)
  for (let i = 0; i + 1 < pts.length; i += 2) {
    const px = parseFloat(pts[i]) + etx
    const py = parseFloat(pts[i + 1]) + ety
    b.minX = Math.min(b.minX, px)
    b.minY = Math.min(b.minY, py)
    b.maxX = Math.max(b.maxX, px)
    b.maxY = Math.max(b.maxY, py)
  }
}

function getTranslate(el: Element): { tx: number; ty: number } {
  const transform = el.getAttribute('transform') ?? ''
  const match = /translate\(\s*([\d.eE+-]+)[,\s]+([\d.eE+-]+)\s*\)/.exec(transform)
  if (!match) return { tx: 0, ty: 0 }
  return { tx: parseFloat(match[1]), ty: parseFloat(match[2]) }
}

function getNodeBBox(nodeEl: Element): { x: number; y: number; width: number; height: number } {
  const { tx, ty } = getTranslate(nodeEl)
  const b: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }

  for (const shape of nodeEl.querySelectorAll('rect, ellipse, polygon, circle')) {
    const tag = shape.tagName.toLowerCase()
    if (tag === 'rect') expandRectBounds(b, shape)
    else if (tag === 'ellipse') expandEllipseBounds(b, shape)
    else if (tag === 'polygon') expandPolygonBounds(b, shape)
  }

  if (isFinite(b.minX)) {
    return { x: tx + b.minX, y: ty + b.minY, width: b.maxX - b.minX, height: b.maxY - b.minY }
  }

  // No standard shape found (e.g. stadium uses <path>). Derive bbox from the
  // label <g> transform + foreignObject dimensions, which Mermaid always emits.
  const labelG = nodeEl.querySelector('g.label')
  if (labelG) {
    const lt = getTranslate(labelG)
    const fo = labelG.querySelector('foreignObject')
    if (fo) {
      const foW = parseFloat(fo.getAttribute('width') ?? '0')
      const foH = parseFloat(fo.getAttribute('height') ?? '0')
      if (foW > 0 && foH > 0) {
        return { x: tx + lt.tx, y: ty + lt.ty, width: foW, height: foH }
      }
    }
  }

  return { x: tx, y: ty, width: 120, height: 40 }
}

// Mermaid v11 node SVG ids: "{renderId}-flowchart-{logicalId}" (no trailing counter).
// Older format: "flowchart-{logicalId}-{counter}".
// Both cases: take everything after the last "flowchart-", then strip a trailing counter.
function extractLogicalNodeId(svgId: string): string {
  const afterFlowchart = svgId.replace(/^.*flowchart-/, '')
  return afterFlowchart.replace(/-\d+$/, '')
}

// Edge data-ids from Mermaid are "L_{source}_{target}_{counter}".
// Given the set of known logical node ids, find the source/target split.
function parseEdgeDataId(dataId: string, nodeIds: Set<string>): { source: string; target: string } | null {
  const withoutPrefix = dataId.replace(/^L_/, '')
  const withoutCounter = withoutPrefix.replace(/_\d+$/, '')
  const tokens = withoutCounter.split('_')

  for (let i = 1; i < tokens.length; i++) {
    const src = tokens.slice(0, i).join('_')
    const tgt = tokens.slice(i).join('_')
    if (nodeIds.has(src) && nodeIds.has(tgt)) {
      return { source: src, target: tgt }
    }
  }
  return null
}

function readViewBox(svgEl: Element): string {
  return svgEl.getAttribute('viewBox') ?? svgEl.getAttribute('viewbox') ?? '0 0 800 600'
}

export function bootstrapGraph(svgString: string): DiagramGraph {
  // Parse by setting innerHTML on a throwaway div — the same HTML parser that
  // Mermaid v11 uses when it serializes via element.innerHTML, so lowercased
  // <foreignobject> and unprefixed nested HTML round-trip cleanly.
  const container = document.createElement('div')
  container.innerHTML = svgString
  const svgEl = container.querySelector('svg')

  if (!svgEl) {
    console.warn('[bootstrap] no <svg> found in rendered output')
    return { nodes: [], edges: [], routing: 'orthogonal', viewBox: '0 0 800 600' }
  }

  const viewBox = readViewBox(svgEl)

  const nodes: DiagramNode[] = []
  const nodeIdMap = new Map<string, string>() // svgId -> logicalId

  for (const el of svgEl.querySelectorAll('g.node')) {
    const svgId = el.id
    if (!svgId) continue
    const logicalId = extractLogicalNodeId(svgId)
    nodeIdMap.set(svgId, logicalId)
    const bbox = getNodeBBox(el)
    nodes.push({
      id: logicalId,
      label: extractLabel(el),
      shape: detectShape(el),
      ...bbox,
    })
  }

  const nodeIdSet = new Set(nodes.map((n) => n.id))

  // Collect edge labels from <g data-id> elements before deduplication.
  const edgeLabels = new Map<string, string>()
  for (const el of svgEl.querySelectorAll('g[data-id]')) {
    const dataId = el.getAttribute('data-id')
    if (!dataId) continue
    const text = el.textContent?.trim()
    if (text) edgeLabels.set(dataId, text)
  }

  const edges: DiagramEdge[] = []
  // In Mermaid v11, both the edge <path> and the label <g> carry data-id.
  // Process paths first to avoid duplicate edge entries.
  const seen = new Set<string>()
  for (const el of svgEl.querySelectorAll('path[data-id], g[data-id]')) {
    const dataId = el.getAttribute('data-id')
    if (!dataId || seen.has(dataId)) continue
    seen.add(dataId)
    const parsed = parseEdgeDataId(dataId, nodeIdSet)
    if (!parsed) continue
    const label = edgeLabels.get(dataId)
    edges.push({ id: dataId, source: parsed.source, target: parsed.target, label })
  }

  return { nodes, edges, routing: 'orthogonal', viewBox }
}
