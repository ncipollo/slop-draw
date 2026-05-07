import { describe, it, expect } from 'vitest'
import { chooseExporter } from './chooseExporter'

function makeSvg(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 100 80')
  return svg
}

describe('chooseExporter', () => {
  it('returns SVG bytes for .svg path', async () => {
    const { filePath, encode } = chooseExporter('/tmp/out.svg', makeSvg())
    expect(filePath).toBe('/tmp/out.svg')
    const bytes = await encode()
    expect(new TextDecoder().decode(bytes)).toMatch(/^<\?xml/)
  })

  it('returns HTML bytes for .html path', async () => {
    const { filePath, encode } = chooseExporter('/tmp/out.html', makeSvg())
    expect(filePath).toBe('/tmp/out.html')
    const bytes = await encode()
    expect(new TextDecoder().decode(bytes)).toMatch(/^<!DOCTYPE/)
  })

  it('strips .html extension for the HTML title', async () => {
    const { encode } = chooseExporter('/tmp/my-diagram.html', makeSvg())
    const bytes = await encode()
    expect(new TextDecoder().decode(bytes)).toContain('<title>my-diagram</title>')
  })

  it('returns HTML bytes for .htm path', async () => {
    const { encode } = chooseExporter('/tmp/out.htm', makeSvg())
    const bytes = await encode()
    expect(new TextDecoder().decode(bytes)).toMatch(/^<!DOCTYPE/)
  })
})
