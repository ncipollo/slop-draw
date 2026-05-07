import type {
  DiagramEdge,
  DiagramGraph,
  DiagramNode,
  FlowchartGraph,
  NodeShape,
  SequenceActor,
  SequenceArrowKind,
  SequenceGraph,
  SequenceMessage,
} from './graph'

// ─── Shared helpers ────────────────────────────────────────────────────────

function readViewBox(svgEl: Element): string {
  return svgEl.getAttribute('viewBox') ?? svgEl.getAttribute('viewbox') ?? '0 0 800 600'
}

function extractTextContent(el: Element): string {
  const fo = el.querySelector('foreignObject')
  if (fo) return (fo.textContent ?? '').trim()
  const span = el.querySelector('span')
  if (span) return (span.textContent ?? '').trim()
  return (el.textContent ?? '').trim()
}

function parseSvg(svgString: string): Element | null {
  const container = document.createElement('div')
  container.innerHTML = svgString
  return container.querySelector('svg')
}

// ─── Flowchart parser ───────────────────────────────────────────────────────

type NodeShape_ = NodeShape

function detectShape(nodeEl: Element): NodeShape_ {
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

function bootstrapFlowchart(svgEl: Element): FlowchartGraph {
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

  return { kind: 'flowchart', nodes, edges, routing: 'orthogonal', viewBox }
}

// ─── Sequence parser ────────────────────────────────────────────────────────

type ArrowBase = 'open' | 'cross' | 'solid'

function detectArrowBase(fragment: string, original: string): ArrowBase {
  if (fragment.includes('arrowhead')) return 'open'
  if (fragment.includes('cross')) return 'cross'
  const isKnown =
    fragment.includes('filled') || fragment.includes('stick') || fragment.includes('head') || fragment === ''
  if (!isKnown) {
    console.warn('[bootstrap] unrecognized sequence arrow marker:', original, '— defaulting to solid')
  }
  return 'solid'
}

function parseMarkerKind(cls: string, markerEnd: string): SequenceArrowKind {
  const isDashed = cls.includes('messageLine1')
  const fragment = (markerEnd.split('#').pop() ?? '').toLowerCase()
  const base = detectArrowBase(fragment, markerEnd)
  if (base === 'open') return isDashed ? 'dashedOpen' : 'solidOpen'
  if (base === 'cross') return isDashed ? 'dashedCross' : 'cross'
  return isDashed ? 'dashed' : 'solid'
}

type TextNode = { x: number; y: number; text: string }

function collectMessageTexts(svgEl: Element): TextNode[] {
  const result: TextNode[] = []
  for (const el of svgEl.querySelectorAll('text.messageText')) {
    const x = parseFloat(el.getAttribute('x') ?? '0')
    const y = parseFloat(el.getAttribute('y') ?? '0')
    const text = (el.textContent ?? '').trim()
    if (text) result.push({ x, y, text })
  }
  return result
}

function associateLabel(
  x1: number,
  x2: number,
  msgY: number,
  isSelf: boolean,
  selfLoopHeight: number,
  texts: TextNode[],
): string {
  const minX = Math.min(x1, x2)
  const maxX = Math.max(x1, x2)

  let best: TextNode | null = null
  let bestDist = Infinity

  for (const t of texts) {
    const dy = Math.abs(t.y - msgY)
    if (dy > 50) continue
    const inBand = isSelf
      ? t.y >= msgY - 50 && t.y <= msgY + selfLoopHeight + 5
      : t.x >= minX - 10 && t.x <= maxX + 10
    if (!inBand) continue
    if (dy < bestDist) {
      bestDist = dy
      best = t
    }
  }

  return best?.text ?? ''
}

// Walk SVG in document order and pair each text.messageText with the message
// element (line or path) that immediately follows it in the tree — the same
// order Mermaid v11 emits them (drawMessage appends the text before the line).
function pairMessagesWithTexts(svgEl: Element): Map<Element, string> {
  const pairs = new Map<Element, string>()
  let pendingText = ''

  for (const el of svgEl.querySelectorAll(
    'text.messageText, line[data-et="message"], path[data-et="message"]',
  )) {
    if (el.getAttribute('data-et') === 'message') {
      if (pendingText) {
        pairs.set(el, pendingText)
        pendingText = ''
      }
    } else {
      const text = (el.textContent ?? '').trim()
      if (text) pendingText = text
    }
  }

  return pairs
}

function extractActorLabel(actorGroup: Element | null, fallback: string): string {
  if (!actorGroup) return fallback
  const fo = actorGroup.querySelector('foreignObject')
  if (fo) return (fo.textContent ?? '').trim() || fallback
  const text = actorGroup.querySelector('text.actor')
  if (text) return (text.textContent ?? '').trim() || fallback
  return extractTextContent(actorGroup) || fallback
}

type ActorBox = { x: number; topY: number; width: number; height: number }

function parseActorBox(rect: Element): ActorBox {
  return {
    x: parseFloat(rect.getAttribute('x') ?? '0'),
    topY: parseFloat(rect.getAttribute('y') ?? '0'),
    width: parseFloat(rect.getAttribute('width') ?? '60'),
    height: parseFloat(rect.getAttribute('height') ?? '40'),
  }
}

function readActorBottomY(actorGroup: Element | null, fallback: number): number {
  const rects = actorGroup?.querySelectorAll<Element>('rect.actor')
  const bottomRect = rects && rects.length > 1 ? rects[1] : null
  if (!bottomRect) return fallback
  return parseFloat(bottomRect.getAttribute('y') ?? String(fallback))
}

function extractSequenceActors(svgEl: Element): SequenceActor[] {
  const actors: SequenceActor[] = []

  for (const lifeline of svgEl.querySelectorAll<Element>('line[data-et="life-line"]')) {
    const id = lifeline.getAttribute('data-id') ?? ''
    if (!id) continue

    const lifelineTopY = parseFloat(lifeline.getAttribute('y1') ?? '0')
    const lifelineBottomY = parseFloat(lifeline.getAttribute('y2') ?? '0')
    const lifelineCx = parseFloat(lifeline.getAttribute('x1') ?? '0')

    const actorGroup = lifeline.parentElement
    const topRect = actorGroup?.querySelector<Element>('rect.actor') ?? null
    const box: ActorBox = topRect
      ? parseActorBox(topRect)
      : { x: lifelineCx - 30, topY: lifelineTopY - 40, width: 60, height: 40 }

    actors.push({
      id,
      label: extractActorLabel(actorGroup ?? null, id),
      x: box.x,
      topY: box.topY,
      bottomY: readActorBottomY(actorGroup ?? null, lifelineBottomY),
      width: box.width,
      height: box.height,
      lifelineTopY,
      lifelineBottomY,
    })
  }

  return actors
}

function parseSelfMessage(el: Element): { msgY: number; selfLoopHeight: number } {
  const d = el.getAttribute('d') ?? ''
  const mMatch = /M[\s,]*([\d.eE+-]+)[\s,]+([\d.eE+-]+)/.exec(d)
  const msgY = mMatch ? parseFloat(mMatch[2]) : 0

  // Orthogonal path (H/V commands)
  const vMatch = /V[\s,]*([\d.eE+-]+)/.exec(d)
  if (vMatch) {
    return { msgY, selfLoopHeight: Math.abs(parseFloat(vMatch[1]) - msgY) }
  }

  // Bezier path (C cp1 cp2 endX,endY) — end-point Y is the 6th coordinate
  const cMatch = /C[\s,]*([\d.eE+-]+)[\s,]+([\d.eE+-]+)[\s,]+([\d.eE+-]+)[\s,]+([\d.eE+-]+)[\s,]+([\d.eE+-]+)[\s,]+([\d.eE+-]+)/.exec(
    d,
  )
  if (cMatch) {
    return { msgY, selfLoopHeight: Math.abs(parseFloat(cMatch[6]) - msgY) }
  }

  return { msgY, selfLoopHeight: 20 }
}

function extractSequenceMessages(svgEl: Element, texts: TextNode[]): SequenceMessage[] {
  const pairMap = pairMessagesWithTexts(svgEl)
  const messages: SequenceMessage[] = []

  for (const el of svgEl.querySelectorAll<Element>('line[data-et="message"], path[data-et="message"]')) {
    const id = el.getAttribute('data-id') ?? el.getAttribute('id') ?? ''
    const fromActor = el.getAttribute('data-from') ?? ''
    const toActor = el.getAttribute('data-to') ?? ''
    const isSelf = el.tagName.toLowerCase() === 'path'
    const cls = el.getAttribute('class') ?? ''
    const markerEnd = el.getAttribute('marker-end') ?? ''
    const arrowKind = parseMarkerKind(cls, markerEnd)

    let msgY = 0
    let selfLoopHeight = 20

    if (isSelf) {
      const parsed = parseSelfMessage(el)
      msgY = parsed.msgY
      selfLoopHeight = parsed.selfLoopHeight
    } else {
      msgY = parseFloat(el.getAttribute('y1') ?? '0')
    }

    const x1 = parseFloat(el.getAttribute('x1') ?? '0')
    const x2 = parseFloat(el.getAttribute('x2') ?? '0')
    const label =
      pairMap.get(el) ?? associateLabel(x1, x2, msgY, isSelf, selfLoopHeight, texts)

    messages.push({
      id,
      fromActor,
      toActor,
      y: msgY,
      isSelf,
      selfLoopHeight: isSelf ? selfLoopHeight : undefined,
      label,
      arrowKind,
    })
  }

  return messages
}

function bootstrapSequence(svgEl: Element): SequenceGraph {
  const viewBox = readViewBox(svgEl)
  const texts = collectMessageTexts(svgEl)
  const actors = extractSequenceActors(svgEl)
  const messages = extractSequenceMessages(svgEl, texts)
  return { kind: 'sequence', actors, messages, viewBox }
}

// ─── Entry point ────────────────────────────────────────────────────────────

function emptyFlowchart(): FlowchartGraph {
  return { kind: 'flowchart', nodes: [], edges: [], routing: 'orthogonal', viewBox: '0 0 800 600' }
}

export function bootstrapGraph(svgString: string): DiagramGraph {
  const svgEl = parseSvg(svgString)
  if (!svgEl) {
    console.warn('[bootstrap] no <svg> found in rendered output')
    return emptyFlowchart()
  }
  if (svgEl.querySelector('[data-et="life-line"]')) return bootstrapSequence(svgEl)
  return bootstrapFlowchart(svgEl)
}
