import { describe, it, expect } from 'vitest'
import { bootstrapGraph } from './bootstrap'
import type { FlowchartGraph } from './graph'

// Mermaid v11 realistic fixture: lowercased <foreignobject>, actual ID format,
// polygon with its own transform, stadium shape using <path>, edge labels.
const MERMAID_V11_FIXTURE = `<svg id="mermaid-1" viewBox="-8 -8 300 320" xmlns="http://www.w3.org/2000/svg">
  <g>
    <g class="nodes">
      <!-- Stadium node: shape is a <path>, no rect. Label group drives the bbox. -->
      <g class="node default" id="mmd-1-flowchart-A" transform="translate(150, 30)">
        <g class="basic label-container outer-path">
          <path d="M-30 -15 C-30 -15 30 -15 30 -15 C30 -15 30 15 30 15 C30 15 -30 15 -30 15 Z"/>
        </g>
        <g class="label" transform="translate(-25, -10)">
          <rect></rect>
          <foreignobject width="50" height="20">
            <div xmlns="http://www.w3.org/1999/xhtml"><span>Start</span></div>
          </foreignobject>
        </g>
      </g>
      <!-- Diamond node: polygon carries its own translate transform -->
      <g class="node default" id="mmd-1-flowchart-B" transform="translate(150, 150)">
        <polygon points="60,0 120,-60 60,-120 0,-60" class="label-container"
                 transform="translate(-60, 60)"/>
        <g class="label" transform="translate(-40, -40)">
          <rect></rect>
          <foreignobject width="80" height="80">
            <div xmlns="http://www.w3.org/1999/xhtml"><span>Decision?</span></div>
          </foreignobject>
        </g>
      </g>
      <!-- Rect node: standard shape -->
      <g class="node default" id="mmd-1-flowchart-C" transform="translate(150, 280)">
        <rect class="basic label-container" x="-50" y="-20" width="100" height="40"/>
        <g class="label" transform="translate(-30, -10)">
          <rect></rect>
          <foreignobject width="60" height="20">
            <div xmlns="http://www.w3.org/1999/xhtml"><span>End</span></div>
          </foreignobject>
        </g>
      </g>
    </g>
    <g class="edgePaths">
      <path data-id="L_A_B_0" class="flowchart-link" d="M 150,45 L 150,90" fill="none"/>
      <path data-id="L_B_C_0" class="flowchart-link" d="M 150,210 L 150,260" fill="none"/>
    </g>
    <g class="edgeLabels">
      <g class="edgeLabel">
        <g class="label" data-id="L_A_B_0" transform="translate(150,67)">
          <rect></rect>
          <foreignobject width="20" height="14">
            <div>Yes</div>
          </foreignobject>
        </g>
      </g>
      <g class="edgeLabel">
        <g class="label" data-id="L_B_C_0" transform="translate(150,235)">
          <rect></rect>
        </g>
      </g>
    </g>
  </g>
</svg>`

describe('bootstrapGraph — Mermaid v11 realistic fixture', () => {
  const graph = () => bootstrapGraph(MERMAID_V11_FIXTURE) as FlowchartGraph

  it('returns kind=flowchart', () => {
    expect(bootstrapGraph(MERMAID_V11_FIXTURE).kind).toBe('flowchart')
  })

  it('parses node count', () => {
    expect(graph().nodes).toHaveLength(3)
  })

  it('extracts logical node ids from prefixed SVG ids', () => {
    const ids = graph().nodes.map((n) => n.id).sort()
    expect(ids).toEqual(['A', 'B', 'C'])
  })

  it('detects stadium shape (path-only node)', () => {
    const a = graph().nodes.find((n) => n.id === 'A')!
    expect(a.shape).toBe('stadium')
  })

  it('derives stadium bbox from label group + foreignObject', () => {
    const a = graph().nodes.find((n) => n.id === 'A')!
    // label group translate(-25,-10) + node translate(150,30)
    expect(a.x).toBeCloseTo(125)  // 150 + (-25)
    expect(a.y).toBeCloseTo(20)   // 30  + (-10)
    expect(a.width).toBeCloseTo(50)
    expect(a.height).toBeCloseTo(20)
  })

  it('detects diamond shape', () => {
    const b = graph().nodes.find((n) => n.id === 'B')!
    expect(b.shape).toBe('diamond')
  })

  it('applies polygon transform when computing diamond bbox', () => {
    const b = graph().nodes.find((n) => n.id === 'B')!
    // polygon points(0,-60,120,60 after translate(-60,60)): minX=-60,minY=-60,maxX=60,maxY=60
    expect(b.x).toBeCloseTo(90)   // 150 + (-60)
    expect(b.y).toBeCloseTo(90)   // 150 + (-60)
    expect(b.width).toBeCloseTo(120)
    expect(b.height).toBeCloseTo(120)
  })

  it('skips empty placeholder rect and uses real rect for standard node', () => {
    const c = graph().nodes.find((n) => n.id === 'C')!
    expect(c.x).toBeCloseTo(100)  // 150 + (-50)
    expect(c.y).toBeCloseTo(260)  // 280 + (-20)
    expect(c.width).toBeCloseTo(100)
    expect(c.height).toBeCloseTo(40)
  })

  it('parses edge count', () => {
    expect(graph().edges).toHaveLength(2)
  })

  it('attaches edge label when label group has text', () => {
    const edges = graph().edges
    const ab = edges.find((e) => e.source === 'A' && e.target === 'B')!
    expect(ab.label).toBe('Yes')
  })

  it('omits edge label when label group is empty', () => {
    const edges = graph().edges
    const bc = edges.find((e) => e.source === 'B' && e.target === 'C')!
    expect(bc.label).toBeUndefined()
  })
})

// Hand-crafted XML fixture — well-formed, tests the older flowchart-{id}-{counter} ID format.
const FIXTURE_SVG = `<svg id="mmd-1" viewBox="-8 -8 300 220" xmlns="http://www.w3.org/2000/svg">
  <g>
    <g class="nodes">
      <g class="node default" id="flowchart-A-0" transform="translate(75, 50)">
        <rect x="-40" y="-20" width="80" height="40" rx="0" ry="0"/>
        <foreignObject x="-40" y="-20" width="80" height="40">
          <div xmlns="http://www.w3.org/1999/xhtml">Start</div>
        </foreignObject>
      </g>
      <g class="node default" id="flowchart-B-1" transform="translate(75, 150)">
        <rect x="-40" y="-20" width="80" height="40" rx="0" ry="0"/>
        <foreignObject x="-40" y="-20" width="80" height="40">
          <div xmlns="http://www.w3.org/1999/xhtml">End</div>
        </foreignObject>
      </g>
    </g>
    <g class="edgePaths">
      <path id="mmd-1-L_A_B_0" data-id="L_A_B_0"
        class="edge-thickness-normal edge-pattern-solid flowchart-link"
        d="M 75,70 L 75,130" fill="none"/>
    </g>
    <g class="edgeLabels">
      <g class="edgeLabel">
        <g class="label" data-id="L_A_B_0" transform="translate(0,0)">
          <text></text>
        </g>
      </g>
    </g>
  </g>
</svg>`

describe('bootstrapGraph — legacy XML fixture', () => {
  const graph = () => bootstrapGraph(FIXTURE_SVG) as FlowchartGraph

  it('returns kind=flowchart', () => {
    expect(bootstrapGraph(FIXTURE_SVG).kind).toBe('flowchart')
  })

  it('parses node count', () => {
    expect(graph().nodes).toHaveLength(2)
  })

  it('extracts logical node ids (strips flowchart- prefix and counter suffix)', () => {
    const ids = graph().nodes.map((n) => n.id).sort()
    expect(ids).toEqual(['A', 'B'])
  })

  it('extracts node labels', () => {
    const labels = graph().nodes.map((n) => n.label).sort()
    expect(labels).toEqual(['End', 'Start'])
  })

  it('extracts node bounding box from translate + shape offsets', () => {
    const a = graph().nodes.find((n) => n.id === 'A')!
    expect(a.x).toBeCloseTo(35)   // 75 + (-40)
    expect(a.y).toBeCloseTo(30)   // 50 + (-20)
    expect(a.width).toBeCloseTo(80)
    expect(a.height).toBeCloseTo(40)
  })

  it('parses edge count', () => {
    expect(graph().edges).toHaveLength(1)
  })

  it('parses edge source and target', () => {
    expect(graph().edges[0].source).toBe('A')
    expect(graph().edges[0].target).toBe('B')
  })

  it('does not duplicate edges from path + label both carrying data-id', () => {
    expect(graph().edges).toHaveLength(1)
  })

  it('reads viewBox from the SVG root', () => {
    expect(graph().viewBox).toBe('-8 -8 300 220')
  })

  it('sets default routing to orthogonal', () => {
    expect(graph().routing).toBe('orthogonal')
  })
})
