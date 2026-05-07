import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNodeSelection } from './useNodeSelection'

function makeDidPanRef(value = false) {
  return { current: value } as React.RefObject<boolean>
}

function makeSvgMouseEvent(): React.MouseEvent<SVGGElement> {
  return {} as unknown as React.MouseEvent<SVGGElement>
}

describe('useNodeSelection', () => {
  it('selectedNodeId starts null', () => {
    const { result } = renderHook(() =>
      useNodeSelection({ didPanRef: makeDidPanRef() }),
    )
    expect(result.current.selectedNodeId).toBeNull()
  })

  it('onNodeClick with an id sets selectedNodeId', () => {
    const { result } = renderHook(() =>
      useNodeSelection({ didPanRef: makeDidPanRef() }),
    )
    act(() => { result.current.onNodeClick(makeSvgMouseEvent(), 'A') })
    expect(result.current.selectedNodeId).toBe('A')
  })

  it('onNodeClick the same id again deselects it', () => {
    const { result } = renderHook(() =>
      useNodeSelection({ didPanRef: makeDidPanRef() }),
    )
    act(() => { result.current.onNodeClick(makeSvgMouseEvent(), 'A') })
    act(() => { result.current.onNodeClick(makeSvgMouseEvent(), 'A') })
    expect(result.current.selectedNodeId).toBeNull()
  })

  it('clearSelection clears selectedNodeId', () => {
    const { result } = renderHook(() =>
      useNodeSelection({ didPanRef: makeDidPanRef() }),
    )
    act(() => { result.current.onNodeClick(makeSvgMouseEvent(), 'A') })
    act(() => { result.current.clearSelection() })
    expect(result.current.selectedNodeId).toBeNull()
  })

  it('suppresses click when didPanRef is true and resets it', () => {
    const didPanRef = makeDidPanRef(true)
    const { result } = renderHook(() =>
      useNodeSelection({ didPanRef }),
    )
    act(() => { result.current.onNodeClick(makeSvgMouseEvent(), 'B') })
    expect(result.current.selectedNodeId).toBeNull()
    expect(didPanRef.current).toBe(false)
  })
})
