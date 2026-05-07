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

describe('useMermaidRender', () => {
  const onRendered = vi.fn()
  const onError = vi.fn()

  beforeEach(() => {
    onRendered.mockReset()
    onError.mockReset()
    vi.mocked(getMermaid).mockResolvedValue({
      render: vi.fn().mockResolvedValue({ svg: '<svg id="mock"/>' }),
      initialize: vi.fn(),
    } as unknown as typeof import('mermaid')['default'])
  })

  it('calls onRendered with the svg string on mount', async () => {
    renderHook(() => useMermaidRender({ source: 'flowchart TD\nA-->B', onRendered, onError }))
    await vi.waitFor(() => expect(onRendered).toHaveBeenCalledWith('<svg id="mock"/>'))
  })

  it('does not call onRendered when cancelled before render completes', async () => {
    let resolveRender!: (value: { svg: string }) => void
    const renderPromise = new Promise<{ svg: string }>((res) => { resolveRender = res })
    vi.mocked(getMermaid).mockResolvedValue({
      render: vi.fn().mockReturnValue(renderPromise),
      initialize: vi.fn(),
    } as unknown as typeof import('mermaid')['default'])

    const { unmount } = renderHook(() =>
      useMermaidRender({ source: 'A', onRendered, onError }),
    )
    unmount()
    resolveRender({ svg: '<svg id="should-not-appear"/>' })
    await renderPromise
    expect(onRendered).not.toHaveBeenCalled()
  })

  it('calls nextRenderId for each render', () => {
    vi.mocked(nextRenderId).mockReturnValue('mmd-test')
    renderHook(() => useMermaidRender({ source: 'A-->B', onRendered, onError }))
    expect(nextRenderId).toHaveBeenCalled()
  })
})
