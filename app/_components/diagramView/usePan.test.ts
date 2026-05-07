import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePan } from './usePan'

function makeMouseEvent(overrides: Partial<MouseEvent> = {}): React.MouseEvent<HTMLDivElement> {
  return {
    clientX: 0,
    clientY: 0,
    preventDefault: vi.fn(),
    target: document.createElement('div'),
    ...overrides,
  } as unknown as React.MouseEvent<HTMLDivElement>
}

function attachScrollerRef(result: ReturnType<typeof usePan>) {
  const div = document.createElement('div')
  Object.defineProperty(div, 'scrollLeft', { value: 0, writable: true })
  Object.defineProperty(div, 'scrollTop', { value: 0, writable: true })
  ;(result.scrollerRef as React.MutableRefObject<HTMLDivElement>).current = div
  return div
}

describe('usePan', () => {
  it('isPanning starts false', () => {
    const { result } = renderHook(() => usePan())
    expect(result.current.isPanning).toBe(false)
  })

  it('isPanning becomes true after mousedown and false after mouseup', () => {
    const { result } = renderHook(() => usePan())
    attachScrollerRef(result.current)
    act(() => { result.current.handlers.onMouseDown(makeMouseEvent()) })
    expect(result.current.isPanning).toBe(true)
    act(() => { result.current.handlers.onMouseUp() })
    expect(result.current.isPanning).toBe(false)
  })

  it('didPanRef resets to false on mousedown', () => {
    const { result } = renderHook(() => usePan())
    attachScrollerRef(result.current)
    result.current.didPanRef.current = true
    act(() => { result.current.handlers.onMouseDown(makeMouseEvent()) })
    expect(result.current.didPanRef.current).toBe(false)
  })

  it('didPanRef becomes true after mousemove', () => {
    const { result } = renderHook(() => usePan())
    attachScrollerRef(result.current)
    act(() => { result.current.handlers.onMouseDown(makeMouseEvent()) })
    act(() => { result.current.handlers.onMouseMove(makeMouseEvent({ clientX: 10, clientY: 5 })) })
    expect(result.current.didPanRef.current).toBe(true)
  })

  it('does nothing on mousemove when scrollerRef is null', () => {
    const { result } = renderHook(() => usePan())
    // panState is null since no mousedown — this should be a no-op
    expect(() => {
      act(() => { result.current.handlers.onMouseMove(makeMouseEvent()) })
    }).not.toThrow()
  })

  it('does not start pan when clicking a g.node element', () => {
    const { result } = renderHook(() => usePan())
    attachScrollerRef(result.current)
    const node = document.createElement('g')
    node.className = 'node'
    document.body.appendChild(node)
    const target = document.createElement('rect')
    node.appendChild(target)
    act(() => {
      result.current.handlers.onMouseDown(makeMouseEvent({ target: target as unknown as EventTarget }))
    })
    expect(result.current.isPanning).toBe(false)
    document.body.removeChild(node)
  })
})
