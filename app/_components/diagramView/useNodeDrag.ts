import { useRef, useState } from 'react'
import type { UseGraphStateResult } from './useGraphState'

type DragState = {
  nodeId: string
  offsetX: number
  offsetY: number
  pointerId: number
}

type UseNodeDragResult = {
  draggingNodeId: string | null
  onNodePointerDown: (e: React.PointerEvent<SVGGElement>, id: string) => void
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
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)

  function onNodePointerDown(e: React.PointerEvent<SVGGElement>, id: string) {
    e.stopPropagation()
    const svg = (e.currentTarget as SVGGElement).ownerSVGElement
    if (!svg) return
    const node = graphState.graph?.nodes.find((n) => n.id === id)
    if (!node) return
    const svgPt = clientToSvg(svg, e.clientX, e.clientY)
    dragState.current = {
      nodeId: id,
      offsetX: svgPt.x - node.x,
      offsetY: svgPt.y - node.y,
      pointerId: e.pointerId,
    }
    setDraggingNodeId(id)
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function onSvgPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragState.current) return
    const svg = e.currentTarget
    const svgPt = clientToSvg(svg, e.clientX, e.clientY)
    graphState.updateNode(dragState.current.nodeId, {
      x: svgPt.x - dragState.current.offsetX,
      y: svgPt.y - dragState.current.offsetY,
    })
  }

  function onSvgPointerUp() {
    dragState.current = null
    setDraggingNodeId(null)
  }

  return { draggingNodeId, onNodePointerDown, onSvgPointerMove, onSvgPointerUp }
}
