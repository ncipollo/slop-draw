import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rasterizeImageToPng } from './rasterizeImageToPng'
import { PNG_SCALE } from './constants'

describe('rasterizeImageToPng', () => {
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  let mockCtx: {
    fillStyle: string
    fillRect: ReturnType<typeof vi.fn>
    drawImage: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockCtx = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() }
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx)
    HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((cb: BlobCallback) => {
      cb({
        arrayBuffer: () => Promise.resolve(pngBytes.buffer),
        size: pngBytes.length,
        type: 'image/png',
      } as Blob)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sets canvas dimensions to width * PNG_SCALE and height * PNG_SCALE', async () => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const spy = vi.spyOn(document, 'createElement').mockReturnValue(canvas)
    await rasterizeImageToPng(img, 100, 80)
    spy.mockRestore()
    expect(canvas.width).toBe(100 * PNG_SCALE)
    expect(canvas.height).toBe(80 * PNG_SCALE)
  })

  it('fills white background before drawing', async () => {
    const img = new Image()
    await rasterizeImageToPng(img, 10, 10)
    expect(mockCtx.fillStyle).toBe('#ffffff')
    expect(mockCtx.fillRect).toHaveBeenCalled()
  })

  it('returns PNG bytes from toBlob', async () => {
    const img = new Image()
    const result = await rasterizeImageToPng(img, 10, 10)
    expect(result[0]).toBe(0x89)
    expect(result[1]).toBe(0x50) // P
    expect(result[2]).toBe(0x4e) // N
    expect(result[3]).toBe(0x47) // G
  })
})
