import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useZoom } from './useZoom'

function makeWheelEvent(overrides: Partial<React.WheelEvent> = {}): React.WheelEvent {
  return {
    deltaY: 0,
    ctrlKey: false,
    metaKey: false,
    preventDefault: () => {},
    ...overrides,
  } as unknown as React.WheelEvent
}

describe('useZoom', () => {
  it('zoom starts at 1', () => {
    const { result } = renderHook(() => useZoom())
    expect(result.current.zoom).toBe(1)
  })

  it('zoomIn increments by 0.1', () => {
    const { result } = renderHook(() => useZoom())
    act(() => { result.current.zoomIn() })
    expect(result.current.zoom).toBeCloseTo(1.1)
  })

  it('zoomIn is capped at ZOOM_MAX (5)', () => {
    const { result } = renderHook(() => useZoom())
    for (let i = 0; i < 50; i++) {
      act(() => { result.current.zoomIn() })
    }
    expect(result.current.zoom).toBe(5)
  })

  it('zoomOut decrements by 0.1', () => {
    const { result } = renderHook(() => useZoom())
    act(() => { result.current.zoomOut() })
    expect(result.current.zoom).toBeCloseTo(0.9)
  })

  it('zoomOut is floored at ZOOM_MIN (0.1)', () => {
    const { result } = renderHook(() => useZoom())
    for (let i = 0; i < 20; i++) {
      act(() => { result.current.zoomOut() })
    }
    expect(result.current.zoom).toBeCloseTo(0.1)
  })

  it('zoomReset returns zoom to 1 from any value', () => {
    const { result } = renderHook(() => useZoom())
    act(() => { result.current.zoomIn() })
    act(() => { result.current.zoomIn() })
    act(() => { result.current.zoomReset() })
    expect(result.current.zoom).toBe(1)
  })

  describe('handleZoomWheel', () => {
    it('zooms in when deltaY < 0 with ctrlKey', () => {
      const { result } = renderHook(() => useZoom())
      act(() => {
        result.current.handleZoomWheel(makeWheelEvent({ deltaY: -100, ctrlKey: true }))
      })
      expect(result.current.zoom).toBeCloseTo(1.1)
    })

    it('zooms out when deltaY > 0 with ctrlKey', () => {
      const { result } = renderHook(() => useZoom())
      act(() => {
        result.current.handleZoomWheel(makeWheelEvent({ deltaY: 100, ctrlKey: true }))
      })
      expect(result.current.zoom).toBeCloseTo(0.9)
    })

    it('calls preventDefault when modifier key is held', () => {
      const { result } = renderHook(() => useZoom())
      const preventDefault = vi.fn()
      act(() => {
        result.current.handleZoomWheel(
          makeWheelEvent({ deltaY: -100, ctrlKey: true, preventDefault }),
        )
      })
      expect(preventDefault).toHaveBeenCalled()
    })

    it('is a no-op without modifier key', () => {
      const { result } = renderHook(() => useZoom())
      act(() => {
        result.current.handleZoomWheel(makeWheelEvent({ deltaY: -100 }))
      })
      expect(result.current.zoom).toBe(1)
    })
  })

  describe('global keydown listener', () => {
    it('zooms in on metaKey + =', () => {
      const { result } = renderHook(() => useZoom())
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '=', metaKey: true, bubbles: true }))
      })
      expect(result.current.zoom).toBeCloseTo(1.1)
    })

    it('zooms in on ctrlKey + +', () => {
      const { result } = renderHook(() => useZoom())
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true }))
      })
      expect(result.current.zoom).toBeCloseTo(1.1)
    })

    it('zooms out on metaKey + -', () => {
      const { result } = renderHook(() => useZoom())
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '-', metaKey: true, bubbles: true }))
      })
      expect(result.current.zoom).toBeCloseTo(0.9)
    })

    it('zooms out on ctrlKey + _', () => {
      const { result } = renderHook(() => useZoom())
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '_', ctrlKey: true, bubbles: true }))
      })
      expect(result.current.zoom).toBeCloseTo(0.9)
    })

    it('resets on metaKey + 0', () => {
      const { result } = renderHook(() => useZoom())
      act(() => { result.current.zoomIn() })
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '0', metaKey: true, bubbles: true }))
      })
      expect(result.current.zoom).toBe(1)
    })

    it('is a no-op without modifier key', () => {
      const { result } = renderHook(() => useZoom())
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '=', bubbles: true }))
      })
      expect(result.current.zoom).toBe(1)
    })

    it('removes the listener on unmount', () => {
      const { result, unmount } = renderHook(() => useZoom())
      unmount()
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '=', metaKey: true, bubbles: true }))
      })
      expect(result.current.zoom).toBe(1)
    })
  })
})
