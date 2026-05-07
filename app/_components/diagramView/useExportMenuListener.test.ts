import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('@tauri-apps/api/event')
vi.mock('../exportDiagram', () => ({ exportDiagram: vi.fn() }))

import { listen } from '@tauri-apps/api/event'
import { exportDiagram } from '../exportDiagram'
import { useExportMenuListener } from './useExportMenuListener'

function makeContainerRef(container: HTMLDivElement) {
  return { current: container } as React.RefObject<HTMLDivElement | null>
}

describe('useExportMenuListener', () => {
  beforeEach(() => {
    vi.mocked(exportDiagram).mockResolvedValue(undefined)
  })

  it('registers a menu-export listener on mount', async () => {
    const unlisten = vi.fn()
    vi.mocked(listen).mockResolvedValue(unlisten)

    const container = document.createElement('div')
    renderHook(() => useExportMenuListener({ containerRef: makeContainerRef(container) }))

    await vi.waitFor(() => expect(listen).toHaveBeenCalledWith('menu-export', expect.any(Function)))
  })

  it('calls exportDiagram with the svg element when menu-export fires', async () => {
    let capturedHandler!: () => void
    vi.mocked(listen).mockImplementation((_event, handler) => {
      capturedHandler = handler as () => void
      return Promise.resolve(vi.fn())
    })

    const container = document.createElement('div')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    container.appendChild(svg)

    renderHook(() => useExportMenuListener({ containerRef: makeContainerRef(container) }))
    await vi.waitFor(() => expect(capturedHandler).toBeDefined())

    capturedHandler()
    expect(exportDiagram).toHaveBeenCalledWith(container)
  })

  it('calls unlisten on unmount', async () => {
    const unlisten = vi.fn()
    vi.mocked(listen).mockResolvedValue(unlisten)

    const container = document.createElement('div')
    const { unmount } = renderHook(() =>
      useExportMenuListener({ containerRef: makeContainerRef(container) }),
    )
    await vi.waitFor(() => expect(listen).toHaveBeenCalled())
    // Flush the .then((fn) => { unlisten = fn }) chain so the cleanup closure captures it
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    unmount()
    expect(unlisten).toHaveBeenCalled()
  })
})
