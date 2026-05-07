import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

import { save } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { exportDiagram } from './exportDiagram'

function makeSvg(width = '100', height = '80'): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  if (width) svg.setAttribute('width', width)
  if (height) svg.setAttribute('height', height)
  svg.innerHTML = '<rect width="100" height="80" fill="blue"/>'
  return svg
}

function stubObjectUrl() {
  const orig = { create: URL.createObjectURL, revoke: URL.revokeObjectURL }
  URL.createObjectURL = vi.fn().mockReturnValue('blob:stub')
  URL.revokeObjectURL = vi.fn()
  return () => {
    URL.createObjectURL = orig.create
    URL.revokeObjectURL = orig.revoke
  }
}

function stubCanvas() {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillStyle: '',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  })
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((cb: BlobCallback) => {
    // Pass a duck-typed object so arrayBuffer() works in jsdom (which lacks it on real Blob).
    cb({ arrayBuffer: () => Promise.resolve(pngBytes.buffer), size: pngBytes.length, type: 'image/png' } as Blob)
  })
}

function stubImage() {
  const OriginalImage = globalThis.Image
  globalThis.Image = class MockImage {
    onload: (() => void) | null = null
    onerror: ((e: unknown) => void) | null = null
    set src(_: string) {
      setTimeout(() => this.onload?.(), 0)
    }
  } as unknown as typeof Image
  return () => { globalThis.Image = OriginalImage }
}

describe('exportDiagram', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does nothing when svg is null', async () => {
    await exportDiagram(null)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('does nothing when save is cancelled', async () => {
    vi.mocked(save).mockResolvedValueOnce(null)
    await exportDiagram(makeSvg())
    expect(invoke).not.toHaveBeenCalled()
  })

  it('passes three format filters to save', async () => {
    vi.mocked(save).mockResolvedValueOnce(null)
    await exportDiagram(makeSvg())
    const opts = vi.mocked(save).mock.calls[0][0] as { filters: Array<{ name: string; extensions: string[] }> }
    expect(opts.filters).toHaveLength(3)
    expect(opts.filters.map((f) => f.extensions[0])).toEqual(['png', 'svg', 'html'])
  })

  it('exports SVG: contents start with <?xml', async () => {
    vi.mocked(save).mockResolvedValueOnce('/tmp/diagram.svg')
    await exportDiagram(makeSvg())
    expect(invoke).toHaveBeenCalledWith('write_file_bytes', expect.objectContaining({ path: '/tmp/diagram.svg' }))
    const { contents } = (invoke as ReturnType<typeof vi.fn>).mock.calls[0][1] as { contents: number[] }
    const text = new TextDecoder().decode(new Uint8Array(contents))
    expect(text).toMatch(/^<\?xml/)
  })

  it('exports HTML: contents start with <!DOCTYPE', async () => {
    vi.mocked(save).mockResolvedValueOnce('/tmp/diagram.html')
    await exportDiagram(makeSvg())
    expect(invoke).toHaveBeenCalledWith('write_file_bytes', expect.objectContaining({ path: '/tmp/diagram.html' }))
    const { contents } = (invoke as ReturnType<typeof vi.fn>).mock.calls[0][1] as { contents: number[] }
    const text = new TextDecoder().decode(new Uint8Array(contents))
    expect(text).toMatch(/^<!DOCTYPE/)
  })

  it('exports PNG: contents start with PNG magic bytes', async () => {
    stubCanvas()
    const restoreUrl = stubObjectUrl()
    const restoreImage = stubImage()
    vi.mocked(save).mockResolvedValueOnce('/tmp/diagram.png')
    await exportDiagram(makeSvg())
    restoreImage()
    restoreUrl()
    expect(invoke).toHaveBeenCalledWith('write_file_bytes', expect.objectContaining({ path: '/tmp/diagram.png' }))
    const { contents } = (invoke as ReturnType<typeof vi.fn>).mock.calls[0][1] as { contents: number[] }
    expect(contents[0]).toBe(0x89)
    expect(contents[1]).toBe(0x50) // P
    expect(contents[2]).toBe(0x4e) // N
    expect(contents[3]).toBe(0x47) // G
  })

  it('appends .png for unknown extension', async () => {
    stubCanvas()
    const restoreUrl = stubObjectUrl()
    const restoreImage = stubImage()
    vi.mocked(save).mockResolvedValueOnce('/tmp/diagram.xyz')
    await exportDiagram(makeSvg())
    restoreImage()
    restoreUrl()
    const { path } = (invoke as ReturnType<typeof vi.fn>).mock.calls[0][1] as { path: string }
    expect(path).toBe('/tmp/diagram.xyz.png')
  })
})
