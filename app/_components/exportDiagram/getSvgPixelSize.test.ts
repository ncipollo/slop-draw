import { describe, it, expect } from 'vitest'
import { getSvgPixelSize } from './getSvgPixelSize'
import { FALLBACK_HEIGHT, FALLBACK_WIDTH } from './constants'

function makeSvg(): SVGSVGElement {
  return document.createElementNS('http://www.w3.org/2000/svg', 'svg')
}

describe('getSvgPixelSize', () => {
  it('returns width/height attributes when both are positive', () => {
    const svg = makeSvg()
    svg.setAttribute('width', '200')
    svg.setAttribute('height', '150')
    expect(getSvgPixelSize(svg)).toEqual({ width: 200, height: 150 })
  })

  it('falls back to viewBox when width/height are absent', () => {
    const svg = makeSvg()
    svg.setAttribute('viewBox', '0 0 320 240')
    expect(getSvgPixelSize(svg)).toEqual({ width: 320, height: 240 })
  })

  it('falls back to viewBox when width/height are zero', () => {
    const svg = makeSvg()
    svg.setAttribute('width', '0')
    svg.setAttribute('height', '0')
    svg.setAttribute('viewBox', '0 0 100 80')
    expect(getSvgPixelSize(svg)).toEqual({ width: 100, height: 80 })
  })

  it('falls back to getBoundingClientRect when viewBox is absent', () => {
    const svg = makeSvg()
    svg.getBoundingClientRect = () => ({ width: 500, height: 400 } as DOMRect)
    expect(getSvgPixelSize(svg)).toEqual({ width: 500, height: 400 })
  })

  it('uses fallback dimensions when getBoundingClientRect returns zero', () => {
    const svg = makeSvg()
    svg.getBoundingClientRect = () => ({ width: 0, height: 0 } as DOMRect)
    expect(getSvgPixelSize(svg)).toEqual({ width: FALLBACK_WIDTH, height: FALLBACK_HEIGHT })
  })

  it('supports comma-separated viewBox values', () => {
    const svg = makeSvg()
    svg.setAttribute('viewBox', '0,0,640,480')
    expect(getSvgPixelSize(svg)).toEqual({ width: 640, height: 480 })
  })
})
