import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('mermaid')
vi.mock('./mermaidLoader', () => {
  let counter = 0
  return {
    getMermaid: vi.fn(),
    nextRenderId: vi.fn(() => `mmd-${++counter}`),
  }
})

import { getMermaid, nextRenderId } from './mermaidLoader'
import { useMermaidRender } from './useMermaidRender'

function makeContainerRef(container: HTMLDivElement) {
  return { current: container } as React.RefObject<HTMLDivElement | null>
}

describe('useMermaidRender', () => {
  beforeEach(() => {
    vi.mocked(getMermaid).mockResolvedValue({
      render: vi.fn().mockResolvedValue({ svg: '<svg id="mock"/>' }),
      initialize: vi.fn(),
    } as unknown as typeof import('mermaid')['default'])
  })

  it('renders mermaid into the container on mount', async () => {
    const container = document.createElement('div')
    const containerRef = makeContainerRef(container)
    renderHook(() => useMermaidRender({ source: 'flowchart TD\nA-->B', containerRef }))
    await vi.waitFor(() => expect(container.innerHTML).toContain('id="mock"'))
  })

  it('does not write to the container when cancelled before render completes', async () => {
    let resolveRender!: (value: { svg: string }) => void
    const renderPromise = new Promise<{ svg: string }>((res) => { resolveRender = res })
    vi.mocked(getMermaid).mockResolvedValue({
      render: vi.fn().mockReturnValue(renderPromise),
      initialize: vi.fn(),
    } as unknown as typeof import('mermaid')['default'])

    const container = document.createElement('div')
    const containerRef = makeContainerRef(container)
    const { unmount } = renderHook(() =>
      useMermaidRender({ source: 'A', containerRef }),
    )
    unmount()
    resolveRender({ svg: '<svg id="should-not-appear"/>' })
    await renderPromise
    expect(container.innerHTML).toBe('')
  })

  it('calls nextRenderId for each render', () => {
    const container = document.createElement('div')
    const containerRef = makeContainerRef(container)
    vi.mocked(nextRenderId).mockReturnValue('mmd-test')
    renderHook(() => useMermaidRender({ source: 'A-->B', containerRef }))
    expect(nextRenderId).toHaveBeenCalled()
  })
})
