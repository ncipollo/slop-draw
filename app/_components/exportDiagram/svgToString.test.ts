import { describe, it, expect, vi } from 'vitest'
import { svgToString } from './svgToString'

function makeSvg(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 200 200')
  return svg
}

describe('svgToString', () => {
  it('sets font-family on the root SVG', () => {
    const svg = makeSvg()
    const result = svgToString(svg)
    expect(result).toMatch(/font-family="[^"]+"/i)
  })

  it('does not hard-code font-family on replaced foreignObject text', () => {
    const svg = makeSvg()
    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject')
    fo.setAttribute('width', '100')
    fo.setAttribute('height', '30')
    const div = document.createElement('div')
    div.textContent = 'Hello'
    fo.appendChild(div)
    svg.appendChild(fo)

    const result = svgToString(svg)
    // The <text> synthesized from foreignObject should not carry its own font-family
    expect(result).not.toMatch(/<text[^>]*font-family[^>]*>/)
  })

  it('preserves the SVG xmlns declaration', () => {
    const svg = makeSvg()
    const result = svgToString(svg)
    expect(result).toContain('xmlns="http://www.w3.org/2000/svg"')
  })

  it('falls back to Arial when body computed font is empty', () => {
    const original = window.getComputedStyle
    vi.stubGlobal(
      'getComputedStyle',
      (el: Element) => {
        if (el === document.body) return { fontFamily: '' } as CSSStyleDeclaration
        return original(el)
      },
    )

    const svg = makeSvg()
    const result = svgToString(svg)
    expect(result).toContain('font-family="Arial')

    vi.unstubAllGlobals()
  })
})
