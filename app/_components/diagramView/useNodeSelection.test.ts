import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNodeSelection } from './useNodeSelection'

function makeContainerRef(container: HTMLDivElement) {
  return { current: container } as React.RefObject<HTMLDivElement | null>
}

function makeDidPanRef(value = false) {
  return { current: value } as React.RefObject<boolean>
}

function makeMouseEvent(target: Element): React.MouseEvent<HTMLDivElement> {
  return { target } as unknown as React.MouseEvent<HTMLDivElement>
}

function makeNodeElement(id: string): HTMLElement {
  const g = document.createElement('g')
  g.className = 'node'
  g.id = id
  const inner = document.createElement('rect')
  g.appendChild(inner)
  return g
}

describe('useNodeSelection', () => {
  it('selectedNodeId starts null', () => {
    const container = document.createElement('div')
    const { result } = renderHook(() =>
      useNodeSelection({ containerRef: makeContainerRef(container), source: 'A', didPanRef: makeDidPanRef() }),
    )
    expect(result.current.selectedNodeId).toBeNull()
  })

  it('clicking a g.node sets selectedNodeId to that node id', () => {
    const container = document.createElement('div')
    const node = makeNodeElement('A')
    container.appendChild(node)
    const didPanRef = makeDidPanRef(false)
    const { result } = renderHook(() =>
      useNodeSelection({ containerRef: makeContainerRef(container), source: 'A', didPanRef }),
    )
    act(() => { result.current.onDiagramClick(makeMouseEvent(node.firstElementChild!)) })
    expect(result.current.selectedNodeId).toBe('A')
  })

  it('clicking the same node again deselects it', () => {
    const container = document.createElement('div')
    const node = makeNodeElement('A')
    container.appendChild(node)
    const didPanRef = makeDidPanRef(false)
    const { result } = renderHook(() =>
      useNodeSelection({ containerRef: makeContainerRef(container), source: 'A', didPanRef }),
    )
    act(() => { result.current.onDiagramClick(makeMouseEvent(node.firstElementChild!)) })
    act(() => { result.current.onDiagramClick(makeMouseEvent(node.firstElementChild!)) })
    expect(result.current.selectedNodeId).toBeNull()
  })

  it('clicking empty area clears selection', () => {
    const container = document.createElement('div')
    const node = makeNodeElement('A')
    container.appendChild(node)
    const didPanRef = makeDidPanRef(false)
    const { result } = renderHook(() =>
      useNodeSelection({ containerRef: makeContainerRef(container), source: 'A', didPanRef }),
    )
    act(() => { result.current.onDiagramClick(makeMouseEvent(node.firstElementChild!)) })
    const empty = document.createElement('div')
    act(() => { result.current.onDiagramClick(makeMouseEvent(empty)) })
    expect(result.current.selectedNodeId).toBeNull()
  })

  it('suppresses click when didPanRef is true and resets it', () => {
    const container = document.createElement('div')
    const node = makeNodeElement('B')
    container.appendChild(node)
    const didPanRef = makeDidPanRef(true)
    const { result } = renderHook(() =>
      useNodeSelection({ containerRef: makeContainerRef(container), source: 'A', didPanRef }),
    )
    act(() => { result.current.onDiagramClick(makeMouseEvent(node.firstElementChild!)) })
    expect(result.current.selectedNodeId).toBeNull()
    expect(didPanRef.current).toBe(false)
  })

  it('applies selected class to the matching node after source changes', async () => {
    const container = document.createElement('div')
    const node = makeNodeElement('X')
    container.appendChild(node)
    const didPanRef = makeDidPanRef(false)
    const { result, rerender } = renderHook(
      ({ source }) =>
        useNodeSelection({ containerRef: makeContainerRef(container), source, didPanRef }),
      { initialProps: { source: 'A' } },
    )
    act(() => { result.current.onDiagramClick(makeMouseEvent(node.firstElementChild!)) })
    expect(node.classList.contains('selected')).toBe(true)
    rerender({ source: 'B' })
    expect(node.classList.contains('selected')).toBe(true)
  })
})
