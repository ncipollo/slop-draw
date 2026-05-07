import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('./exportDiagram/captureElementAsPng', () => ({
  captureElementAsPng: vi.fn(),
}))

import { save } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { captureElementAsPng } from './exportDiagram/captureElementAsPng'
import { exportDiagram } from './exportDiagram'

const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function makeContainer(): HTMLDivElement {
  const div = document.createElement('div')
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 100 80')
  div.appendChild(svg)
  return div
}

describe('exportDiagram', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(captureElementAsPng).mockResolvedValue(PNG_MAGIC)
    vi.mocked(invoke).mockResolvedValue(undefined)
  })

  it('does nothing when container is null', async () => {
    await exportDiagram(null)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('does nothing when save is cancelled', async () => {
    vi.mocked(save).mockResolvedValueOnce(null)
    await exportDiagram(makeContainer())
    expect(invoke).not.toHaveBeenCalled()
  })

  it('passes three format filters to save', async () => {
    vi.mocked(save).mockResolvedValueOnce(null)
    await exportDiagram(makeContainer())
    const opts = vi.mocked(save).mock.calls[0][0] as { filters: Array<{ name: string; extensions: string[] }> }
    expect(opts.filters).toHaveLength(3)
    expect(opts.filters.map((f) => f.extensions[0])).toEqual(['png', 'svg', 'html'])
  })

  it('exports SVG: contents start with <?xml', async () => {
    vi.mocked(save).mockResolvedValueOnce('/tmp/diagram.svg')
    await exportDiagram(makeContainer())
    expect(invoke).toHaveBeenCalledWith('write_file_bytes', expect.objectContaining({ path: '/tmp/diagram.svg' }))
    const { contents } = (invoke as ReturnType<typeof vi.fn>).mock.calls[0][1] as { contents: number[] }
    expect(new TextDecoder().decode(new Uint8Array(contents))).toMatch(/^<\?xml/)
  })

  it('exports HTML: contents start with <!DOCTYPE', async () => {
    vi.mocked(save).mockResolvedValueOnce('/tmp/diagram.html')
    await exportDiagram(makeContainer())
    expect(invoke).toHaveBeenCalledWith('write_file_bytes', expect.objectContaining({ path: '/tmp/diagram.html' }))
    const { contents } = (invoke as ReturnType<typeof vi.fn>).mock.calls[0][1] as { contents: number[] }
    expect(new TextDecoder().decode(new Uint8Array(contents))).toMatch(/^<!DOCTYPE/)
  })

  it('exports PNG via captureElementAsPng', async () => {
    vi.mocked(save).mockResolvedValueOnce('/tmp/diagram.png')
    await exportDiagram(makeContainer())
    expect(captureElementAsPng).toHaveBeenCalled()
    expect(invoke).toHaveBeenCalledWith('write_file_bytes', expect.objectContaining({ path: '/tmp/diagram.png' }))
    const { contents } = (invoke as ReturnType<typeof vi.fn>).mock.calls[0][1] as { contents: number[] }
    expect(contents[0]).toBe(0x89)
  })

  it('appends .png for unknown extension', async () => {
    vi.mocked(save).mockResolvedValueOnce('/tmp/diagram.xyz')
    await exportDiagram(makeContainer())
    const { path } = (invoke as ReturnType<typeof vi.fn>).mock.calls[0][1] as { path: string }
    expect(path).toBe('/tmp/diagram.xyz.png')
  })
})
