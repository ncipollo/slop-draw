import type { DiagramNode, RoutingMode } from './graph'

type Point = { x: number; y: number }

type Side = 'top' | 'right' | 'bottom' | 'left'

type BezierRoute = { start: Point; c1: Point; c2: Point; end: Point }

function nodeCenterX(n: DiagramNode): number {
  return n.x + n.width / 2
}

function nodeCenterY(n: DiagramNode): number {
  return n.y + n.height / 2
}

function sideAnchor(node: DiagramNode, side: Side): Point {
  const cx = nodeCenterX(node)
  const cy = nodeCenterY(node)
  switch (side) {
    case 'top':
      return { x: cx, y: node.y }
    case 'bottom':
      return { x: cx, y: node.y + node.height }
    case 'left':
      return { x: node.x, y: cy }
    case 'right':
      return { x: node.x + node.width, y: cy }
  }
}

function chooseSides(source: DiagramNode, target: DiagramNode): [Side, Side] {
  const dx = nodeCenterX(target) - nodeCenterX(source)
  const dy = nodeCenterY(target) - nodeCenterY(source)
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? ['right', 'left'] : ['left', 'right']
  }
  return dy >= 0 ? ['bottom', 'top'] : ['top', 'bottom']
}

export function routeOrthogonal(source: DiagramNode, target: DiagramNode): Point[] {
  const [srcSide, tgtSide] = chooseSides(source, target)
  const a = sideAnchor(source, srcSide)
  const b = sideAnchor(target, tgtSide)

  const horizontal = srcSide === 'left' || srcSide === 'right'
  if (horizontal) {
    const midX = (a.x + b.x) / 2
    return [a, { x: midX, y: a.y }, { x: midX, y: b.y }, b]
  }
  const midY = (a.y + b.y) / 2
  return [a, { x: a.x, y: midY }, { x: b.x, y: midY }, b]
}

export function routeBezier(source: DiagramNode, target: DiagramNode): BezierRoute {
  const [srcSide, tgtSide] = chooseSides(source, target)
  const start = sideAnchor(source, srcSide)
  const end = sideAnchor(target, tgtSide)

  const dist = Math.hypot(end.x - start.x, end.y - start.y)
  const offset = Math.min(dist / 2, 80)

  const controlOffset = (side: Side): Point => {
    switch (side) {
      case 'right':
        return { x: offset, y: 0 }
      case 'left':
        return { x: -offset, y: 0 }
      case 'bottom':
        return { x: 0, y: offset }
      case 'top':
        return { x: 0, y: -offset }
    }
  }

  const o1 = controlOffset(srcSide)
  const o2 = controlOffset(tgtSide)

  return {
    start,
    c1: { x: start.x + o1.x, y: start.y + o1.y },
    c2: { x: end.x + o2.x, y: end.y + o2.y },
    end,
  }
}

export function buildPathD(source: DiagramNode, target: DiagramNode, routing: RoutingMode): string {
  if (routing === 'bezier') {
    const { start, c1, c2, end } = routeBezier(source, target)
    return `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`
  }
  const pts = routeOrthogonal(source, target)
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}
