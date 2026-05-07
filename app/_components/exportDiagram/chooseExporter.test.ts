import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./loadImageFromSvgString')
vi.mock('./rasterizeImageToPng')

import { loadImageFromSvgString } from './loadImageFromSvgString'
import { rasterizeImageToPng } from './rasterizeImageToPng'
import { chooseExporter } from './chooseExporter'

const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47])

function makeSvg(width = '100', height = '80'): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', width)
  svg.setAttribute('height', height)
  return svg
}

describe('chooseExporter', () => {
  beforeEach(() => {
    vi.mocked(loadImageFromSvgString).mockResolvedValue(new Image())
    vi.mocked(rasterizeImageToPng).mockResolvedValue(PNG_MAGIC)
  })

  it('returns SVG bytes for .svg path', async () => {
    const { filePath, encode } = chooseExporter('/tmp/out.svg', makeSvg())
    expect(filePath).toBe('/tmp/out.svg')
    const bytes = await encode()
    const text = new TextDecoder().decode(bytes)
    expect(text).toMatch(/^<\?xml/)
  })

  it('returns HTML bytes for .html path', async () => {
    const { filePath, encode } = chooseExporter('/tmp/out.html', makeSvg())
    expect(filePath).toBe('/tmp/out.html')
    const bytes = await encode()
    const text = new TextDecoder().decode(bytes)
    expect(text).toMatch(/^<!DOCTYPE/)
  })

  it('strips .html extension for the HTML title', async () => {
    const { encode } = chooseExporter('/tmp/my-diagram.html', makeSvg())
    const bytes = await encode()
    const text = new TextDecoder().decode(bytes)
    expect(text).toContain('<title>my-diagram</title>')
  })

  it('returns HTML bytes for .htm path', async () => {
    const { encode } = chooseExporter('/tmp/out.htm', makeSvg())
    const bytes = await encode()
    const text = new TextDecoder().decode(bytes)
    expect(text).toMatch(/^<!DOCTYPE/)
  })

  it('returns PNG bytes for .png path', async () => {
    const { filePath, encode } = chooseExporter('/tmp/out.png', makeSvg())
    expect(filePath).toBe('/tmp/out.png')
    const bytes = await encode()
    expect(bytes[0]).toBe(0x89)
  })

  it('appends .png for unknown extension', async () => {
    const { filePath } = chooseExporter('/tmp/out.xyz', makeSvg())
    expect(filePath).toBe('/tmp/out.xyz.png')
  })

  it('appends .png when there is no extension', async () => {
    const { filePath } = chooseExporter('/tmp/diagram', makeSvg())
    expect(filePath).toBe('/tmp/diagram.png')
  })
})
