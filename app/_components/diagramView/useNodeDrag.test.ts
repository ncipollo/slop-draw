import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNodeDrag } from './useNodeDrag'
import type { UseGraphStateResult } from './useGraphState'
import type { FlowchartGraph, SequenceGraph } from './graph'

function makeSvg(rect: { left: number; top: number; width: number; height: number }, vb: { x: number; y: number; width: number; height: number }): SVGSVGElement {
  return {
    getBoundingClientRect: () => rect,
    viewBox: { baseVal: vb },
    setPointerCapture: vi.fn(),
  } as unknown as SVGSVGElement
}

function makeFlowchartGraph(overrides: Partial<FlowchartGraph> = {}): FlowchartGraph {
  return {
    kind: 'flowchart',
    nodes: [{ id: 'n1', label: 'Node 1', shape: 'rect', x: 100, y: 200, width: 80, height: 40 }],
    edges: [],
    routing: 'bezier',
    viewBox: '0 0 800 600',
    ...overrides,
  }
}

function makeSequenceGraph(overrides: Partial<SequenceGraph> = {}): SequenceGraph {
  return {
    kind: 'sequence',
    actors: [{ id: 'a1', label: 'Actor 1', x: 150, topY: 10, bottomY: 500, width: 60, height: 30, lifelineTopY: 40, lifelineBottomY: 490 }],
    messages: [],
    viewBox: '0 0 800 600',
    ...overrides,
  }
}

function makeGraphState(graph: FlowchartGraph | SequenceGraph | null = null): UseGraphStateResult {
  return {
    graph,
    dirty: false,
    bootstrapFromSvg: vi.fn(),
    updateNode: vi.fn(),
    setRouting: vi.fn(),
    updateActor: vi.fn(),
    updateMessageLabel: vi.fn(),
  }
}

function makePointerEvent(
  overrides: Partial<{ clientX: number; clientY: number; pointerId: number }> = {},
  svgEl?: SVGSVGElement,
  gEl?: SVGGElement,
): React.PointerEvent<SVGSVGElement> & React.PointerEvent<SVGGElement> {
  const event = {
    clientX: 0,
    clientY: 0,
    pointerId: 1,
    stopPropagation: vi.fn(),
    preventDefault: vi.fn(),
    currentTarget: svgEl ?? gEl ?? {},
    ...overrides,
  }
  return event as unknown as React.PointerEvent<SVGSVGElement> & React.PointerEvent<SVGGElement>
}

describe('useNodeDrag', () => {
  describe('onSvgPointerUp', () => {
    it('clears draggingId', () => {
      const graphState = makeGraphState(makeFlowchartGraph())
      const { result } = renderHook(() => useNodeDrag({ graphState }))
      expect(result.current.draggingId).toBeNull()
      act(() => { result.current.onSvgPointerUp({} as React.PointerEvent<SVGSVGElement>) })
      expect(result.current.draggingId).toBeNull()
    })
  })

  describe('onNodePointerDown', () => {
    it('captures offset correctly from viewBox and bounding rect at zoom=1', () => {
      const rect = { left: 50, top: 50, width: 800, height: 600 }
      const vb = { x: 0, y: 0, width: 800, height: 600 }
      const svg = makeSvg(rect, vb)
      const g = { ownerSVGElement: svg, setPointerCapture: vi.fn() } as unknown as SVGGElement
      const graphState = makeGraphState(makeFlowchartGraph())
      const { result } = renderHook(() => useNodeDrag({ graphState }))

      // Click at client (250, 350): SVG point = (200, 300), offset = (200-100, 300-200) = (100, 100)
      const e = makePointerEvent({ clientX: 250, clientY: 350 }, undefined, g)
      ;(e as unknown as { currentTarget: SVGGElement }).currentTarget = g

      act(() => { result.current.onNodePointerDown(e as unknown as React.PointerEvent<SVGGElement>, 'n1') })
      expect(result.current.draggingId).toBe('n1')

      // Move to client (350, 450): SVG point = (300, 400), new position = (300-100, 400-100) = (200, 300)
      const svgEl = { ...svg, setPointerCapture: vi.fn() } as unknown as SVGSVGElement
      const moveE = makePointerEvent({ clientX: 350, clientY: 450 }, svgEl)
      ;(moveE as unknown as { currentTarget: SVGSVGElement }).currentTarget = svgEl

      act(() => { result.current.onSvgPointerMove(moveE as unknown as React.PointerEvent<SVGSVGElement>) })
      expect(graphState.updateNode).toHaveBeenCalledWith('n1', { x: 200, y: 300 })
    })
  })

  describe('zoom-out drag correctness', () => {
    it('tracks cursor 1:1 visually when zoomed out (rect.width = vb.width * 0.5)', () => {
      // vb = 800x600, rect = 400x300 (zoom=0.5)
      const rect = { left: 0, top: 0, width: 400, height: 300 }
      const vb = { x: 0, y: 0, width: 800, height: 600 }
      const svg = makeSvg(rect, vb)
      const g = { ownerSVGElement: svg, setPointerCapture: vi.fn() } as unknown as SVGGElement
      const graphState = makeGraphState(makeFlowchartGraph())
      const { result } = renderHook(() => useNodeDrag({ graphState }))

      // Node is at (100, 200) in SVG units.
      // At zoom=0.5 it renders at screen position (50, 100).
      // Click at screen (50, 100): SVG point = (0+50/400*800, 0+100/300*600) = (100, 200)
      // offset = (100-100, 200-200) = (0, 0)
      const downE = makePointerEvent({ clientX: 50, clientY: 100 }, undefined, g)
      ;(downE as unknown as { currentTarget: SVGGElement }).currentTarget = g
      act(() => { result.current.onNodePointerDown(downE as unknown as React.PointerEvent<SVGGElement>, 'n1') })

      // Move cursor by 50 screen pixels (to 100, 150)
      // SVG point = (0+100/400*800, 0+150/300*600) = (200, 300)
      // new position = (200-0, 300-0) = (200, 300)
      // Visually at zoom=0.5: (100, 150) on screen — moved 50 screen px, matching cursor delta.
      const svgEl = makeSvg(rect, vb)
      const moveE = makePointerEvent({ clientX: 100, clientY: 150 }, svgEl)
      ;(moveE as unknown as { currentTarget: SVGSVGElement }).currentTarget = svgEl
      act(() => { result.current.onSvgPointerMove(moveE as unknown as React.PointerEvent<SVGSVGElement>) })
      expect(graphState.updateNode).toHaveBeenCalledWith('n1', { x: 200, y: 300 })
    })

    it('does not regress at zoom=1 (rect.width == vb.width)', () => {
      const rect = { left: 0, top: 0, width: 800, height: 600 }
      const vb = { x: 0, y: 0, width: 800, height: 600 }
      const svg = makeSvg(rect, vb)
      const g = { ownerSVGElement: svg, setPointerCapture: vi.fn() } as unknown as SVGGElement
      const graphState = makeGraphState(makeFlowchartGraph())
      const { result } = renderHook(() => useNodeDrag({ graphState }))

      // Click at (100, 200) — right on the node
      const downE = makePointerEvent({ clientX: 100, clientY: 200 }, undefined, g)
      ;(downE as unknown as { currentTarget: SVGGElement }).currentTarget = g
      act(() => { result.current.onNodePointerDown(downE as unknown as React.PointerEvent<SVGGElement>, 'n1') })

      // Move by 50px
      const svgEl = makeSvg(rect, vb)
      const moveE = makePointerEvent({ clientX: 150, clientY: 250 }, svgEl)
      ;(moveE as unknown as { currentTarget: SVGSVGElement }).currentTarget = svgEl
      act(() => { result.current.onSvgPointerMove(moveE as unknown as React.PointerEvent<SVGSVGElement>) })
      expect(graphState.updateNode).toHaveBeenCalledWith('n1', { x: 150, y: 250 })
    })
  })

  describe('onActorPointerDown', () => {
    it('tracks actor horizontally only, correct under zoom-out', () => {
      // zoom=0.5: rect = 400x300, vb = 800x600
      const rect = { left: 0, top: 0, width: 400, height: 300 }
      const vb = { x: 0, y: 0, width: 800, height: 600 }
      const svg = makeSvg(rect, vb)
      const g = { ownerSVGElement: svg, setPointerCapture: vi.fn() } as unknown as SVGGElement
      const graphState = makeGraphState(makeSequenceGraph())
      const { result } = renderHook(() => useNodeDrag({ graphState }))

      // Actor at x=150. Screen position at zoom=0.5 is x=75.
      // Click at screen (75, 50): SVG x = 75/400*800 = 150, offset = 150-150 = 0
      const downE = makePointerEvent({ clientX: 75, clientY: 50 }, undefined, g)
      ;(downE as unknown as { currentTarget: SVGGElement }).currentTarget = g
      act(() => { result.current.onActorPointerDown(downE as unknown as React.PointerEvent<SVGGElement>, 'a1') })
      expect(result.current.draggingId).toBe('a1')

      // Move cursor by 50 screen px horizontally (to x=125)
      // SVG x = 125/400*800 = 250, new actor x = 250-0 = 250
      const svgEl = makeSvg(rect, vb)
      const moveE = makePointerEvent({ clientX: 125, clientY: 50 }, svgEl)
      ;(moveE as unknown as { currentTarget: SVGSVGElement }).currentTarget = svgEl
      act(() => { result.current.onSvgPointerMove(moveE as unknown as React.PointerEvent<SVGSVGElement>) })
      expect(graphState.updateActor).toHaveBeenCalledWith('a1', { x: 250 })
    })
  })
})
