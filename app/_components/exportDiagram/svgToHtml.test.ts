import { describe, it, expect } from 'vitest'
import { svgToHtml } from './svgToHtml'

describe('svgToHtml', () => {
  it('returns bytes that start with <!DOCTYPE', () => {
    const bytes = svgToHtml('<svg/>', 'test')
    const text = new TextDecoder().decode(bytes)
    expect(text).toMatch(/^<!DOCTYPE/)
  })

  it('includes the title in the output', () => {
    const bytes = svgToHtml('<svg/>', 'my-diagram')
    const text = new TextDecoder().decode(bytes)
    expect(text).toContain('<title>my-diagram</title>')
  })

  it('includes the svg string in the body', () => {
    const bytes = svgToHtml('<svg id="test"/>', 'x')
    const text = new TextDecoder().decode(bytes)
    expect(text).toContain('<svg id="test"/>')
  })
})
