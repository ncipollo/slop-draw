import { useRef, useState } from 'react'
import type { UseGraphStateResult } from './useGraphState'

type DragState = {
  id: string
  kind: 'node' | 'actor'
  offsetX: number
  offsetY: number
  pointerId: number
}

type UseNodeDragResult = {
  draggingId: string | null
  onNodePointerDown: (e: React.PointerEvent<SVGGElement>, id: string) => void
  onActorPointerDown: (e: React.PointerEvent<SVGGElement>, id: string) => void
  onSvgPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void
  onSvgPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void
}

type Props = {
  graphState: UseGraphStateResult
}

function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: clientX, y: clientY }
  const transformed = pt.matrixTransform(ctm.inverse())
  return { x: transformed.x, y: transformed.y }
}

export function useNodeDrag({ graphState }: Props): UseNodeDragResult {
  const dragState = useRef<DragState | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  function onNodePointerDown(e: React.PointerEvent<SVGGElement>, id: string) {
    e.stopPropagation()
    const g = graphState.graph
    if (!g || g.kind !== 'flowchart') return
    const svg = (e.currentTarget as SVGGElement).ownerSVGElement
    if (!svg) return
    const node = g.nodes.find((n) => n.id === id)
    if (!node) return
    const svgPt = clientToSvg(svg, e.clientX, e.clientY)
    dragState.current = {
      id,
      kind: 'node',
      offsetX: svgPt.x - node.x,
      offsetY: svgPt.y - node.y,
      pointerId: e.pointerId,
    }
    setDraggingId(id)
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function onActorPointerDown(e: React.PointerEvent<SVGGElement>, id: string) {
    e.stopPropagation()
    const g = graphState.graph
    if (!g || g.kind !== 'sequence') return
    const svg = (e.currentTarget as SVGGElement).ownerSVGElement
    if (!svg) return
    const actor = g.actors.find((a) => a.id === id)
    if (!actor) return
    const svgPt = clientToSvg(svg, e.clientX, e.clientY)
    dragState.current = {
      id,
      kind: 'actor',
      offsetX: svgPt.x - actor.x,
      offsetY: 0,
      pointerId: e.pointerId,
    }
    setDraggingId(id)
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function onSvgPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragState.current) return
    const svg = e.currentTarget
    const svgPt = clientToSvg(svg, e.clientX, e.clientY)

    if (dragState.current.kind === 'node') {
      graphState.updateNode(dragState.current.id, {
        x: svgPt.x - dragState.current.offsetX,
        y: svgPt.y - dragState.current.offsetY,
      })
    } else {
      // Horizontal-only drag for actors.
      graphState.updateActor(dragState.current.id, {
        x: svgPt.x - dragState.current.offsetX,
      })
    }
  }

  function onSvgPointerUp() {
    dragState.current = null
    setDraggingId(null)
  }

  return { draggingId, onNodePointerDown, onActorPointerDown, onSvgPointerMove, onSvgPointerUp }
}
