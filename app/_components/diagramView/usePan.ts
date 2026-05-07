import { useRef, useState } from 'react'

type PanState = {
  startX: number
  startY: number
  scrollLeft: number
  scrollTop: number
}

type PanHandlers = {
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseUp: () => void
}

type UsePanResult = {
  scrollerRef: React.RefObject<HTMLDivElement | null>
  isPanning: boolean
  didPanRef: React.RefObject<boolean>
  handlers: PanHandlers
}

export function usePan(): UsePanResult {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const panState = useRef<PanState | null>(null)
  const didPanRef = useRef(false)
  const [isPanning, setIsPanning] = useState(false)

  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    didPanRef.current = false
    const target = e.target as HTMLElement
    if (target.closest('g.node') ?? target.closest('[data-node-id]')) return
    if (!scrollerRef.current) return
    panState.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: scrollerRef.current.scrollLeft,
      scrollTop: scrollerRef.current.scrollTop,
    }
    setIsPanning(true)
    e.preventDefault()
  }

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!panState.current || !scrollerRef.current) return
    didPanRef.current = true
    scrollerRef.current.scrollLeft =
      panState.current.scrollLeft - (e.clientX - panState.current.startX)
    scrollerRef.current.scrollTop =
      panState.current.scrollTop - (e.clientY - panState.current.startY)
  }

  function onMouseUp() {
    panState.current = null
    setIsPanning(false)
  }

  return { scrollerRef, isPanning, didPanRef, handlers: { onMouseDown, onMouseMove, onMouseUp } }
}
