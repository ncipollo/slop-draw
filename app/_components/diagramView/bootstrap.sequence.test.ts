import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bootstrapGraph } from './bootstrap'
import type { SequenceGraph } from './graph'

// Realistic Mermaid v11 sequence-diagram SVG fixture.
// Structure mirrors real Mermaid 11.14.0 drawMessage output:
//   - Lifelines: <line data-et="life-line" data-id="..." x1 y1 x2 y2>
//   - Actor groups contain <rect class="actor"> (top) and optionally a second (bottom mirror)
//   - Messages: <text class="messageText"> appears BEFORE its <line data-et="message">
//   - Text y is ~31px above the message line y (dy="1em" shifts baseline down in browser)
//   - Self-messages use a Bezier <path data-et="message"> with text placed before it
const SEQUENCE_FIXTURE = `<svg id="mmd-seq-1" viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg">
  <!-- Actor: Alice -->
  <g data-et="participant" data-type="actor" data-id="Alice">
    <rect class="actor" x="30" y="10" width="80" height="40"/>
    <foreignObject x="30" y="10" width="80" height="40">
      <div xmlns="http://www.w3.org/1999/xhtml">Alice</div>
    </foreignObject>
    <line data-et="life-line" data-id="Alice" class="actor-line 200" x1="70" y1="50" x2="70" y2="360"/>
    <!-- Mirror bottom box -->
    <rect class="actor" x="30" y="360" width="80" height="40"/>
    <foreignObject x="30" y="360" width="80" height="40">
      <div xmlns="http://www.w3.org/1999/xhtml">Alice</div>
    </foreignObject>
  </g>

  <!-- Actor: Bob -->
  <g data-et="participant" data-type="actor" data-id="Bob">
    <rect class="actor" x="250" y="10" width="80" height="40"/>
    <foreignObject x="250" y="10" width="80" height="40">
      <div xmlns="http://www.w3.org/1999/xhtml">Bob</div>
    </foreignObject>
    <line data-et="life-line" data-id="Bob" class="actor-line 200" x1="290" y1="50" x2="290" y2="360"/>
    <!-- No mirror (mirrorActors=false) -->
  </g>

  <!-- Message 1: Alice ->> Bob — text before line, text y = line y - 31 -->
  <text class="messageText" x="174" y="80" dy="1em">hello</text>
  <line data-et="message" data-id="i0" data-from="Alice" data-to="Bob"
        class="messageLine0" x1="76" y1="111" x2="271" y2="111"
        marker-end="url(#mmd-seq-1-arrowhead)"/>

  <!-- Message 2: Bob -->> Alice — text before line, text y = line y - 31 -->
  <text class="messageText" x="174" y="129" dy="1em">hi back</text>
  <line data-et="message" data-id="i1" data-from="Bob" data-to="Alice"
        class="messageLine1" x1="271" y1="160" x2="76" y2="160"
        marker-end="url(#mmd-seq-1-arrowhead)"/>

  <!-- Message 3: Alice self-message — Bezier path, text y is 31px above loop start -->
  <text class="messageText" x="76" y="172">think</text>
  <path data-et="message" data-id="i2" data-from="Alice" data-to="Alice"
        class="messageLine0" d="M 76,203 C 136,193 136,233 76,223"
        marker-end="url(#mmd-seq-1-arrowhead)"/>

  <!-- Note (should be gracefully ignored) -->
  <g data-et="note">
    <rect x="120" y="280" width="60" height="30"/>
    <text>some note</text>
  </g>

  <!-- Loop text (should be gracefully ignored) -->
  <text class="loopText">loop condition</text>
</svg>`

// A flowchart SVG — must NOT be detected as a sequence diagram.
const FLOWCHART_FIXTURE = `<svg id="mmd-fc-1" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <g class="nodes">
    <g class="node default" id="mmd-fc-1-flowchart-A" transform="translate(100, 100)">
      <rect x="-40" y="-20" width="80" height="40"/>
      <foreignObject x="-40" y="-20" width="80" height="40">
        <div xmlns="http://www.w3.org/1999/xhtml">A</div>
      </foreignObject>
    </g>
  </g>
</svg>`

describe('bootstrapGraph — sequence diagram fixture', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  const seqGraph = () => bootstrapGraph(SEQUENCE_FIXTURE) as SequenceGraph

  it('returns kind=sequence', () => {
    expect(bootstrapGraph(SEQUENCE_FIXTURE).kind).toBe('sequence')
  })

  it('parses two actors', () => {
    expect(seqGraph().actors).toHaveLength(2)
  })

  it('extracts Alice actor id and label', () => {
    const alice = seqGraph().actors.find((a) => a.id === 'Alice')!
    expect(alice.id).toBe('Alice')
    expect(alice.label).toBe('Alice')
  })

  it('extracts actor position from top rect', () => {
    const alice = seqGraph().actors.find((a) => a.id === 'Alice')!
    expect(alice.x).toBeCloseTo(30)
    expect(alice.topY).toBeCloseTo(10)
    expect(alice.width).toBeCloseTo(80)
    expect(alice.height).toBeCloseTo(40)
  })

  it('reads lifeline span', () => {
    const alice = seqGraph().actors.find((a) => a.id === 'Alice')!
    expect(alice.lifelineTopY).toBeCloseTo(50)
    expect(alice.lifelineBottomY).toBeCloseTo(360)
  })

  it('reads bottom actor box y when mirror is present', () => {
    const alice = seqGraph().actors.find((a) => a.id === 'Alice')!
    expect(alice.bottomY).toBeCloseTo(360)
  })

  it('falls back to lifelineBottomY when no mirror box', () => {
    const bob = seqGraph().actors.find((a) => a.id === 'Bob')!
    expect(bob.bottomY).toBeCloseTo(360)
  })

  it('parses three messages', () => {
    expect(seqGraph().messages).toHaveLength(3)
  })

  it('parses solid open arrow (messageLine0 + arrowhead marker)', () => {
    const msg = seqGraph().messages.find((m) => m.id === 'i0')!
    expect(msg.fromActor).toBe('Alice')
    expect(msg.toActor).toBe('Bob')
    expect(msg.arrowKind).toBe('solidOpen')
    expect(msg.isSelf).toBe(false)
  })

  it('parses dashed open arrow (messageLine1 + arrowhead marker)', () => {
    const msg = seqGraph().messages.find((m) => m.id === 'i1')!
    expect(msg.arrowKind).toBe('dashedOpen')
    expect(msg.isSelf).toBe(false)
  })

  it('associates message labels via document-order pairing', () => {
    const hello = seqGraph().messages.find((m) => m.id === 'i0')!
    expect(hello.label).toBe('hello')
    const hiBack = seqGraph().messages.find((m) => m.id === 'i1')!
    expect(hiBack.label).toBe('hi back')
  })

  it('detects self-message path', () => {
    const self = seqGraph().messages.find((m) => m.id === 'i2')!
    expect(self.isSelf).toBe(true)
    expect(self.fromActor).toBe('Alice')
    expect(self.toActor).toBe('Alice')
    expect(self.label).toBe('think')
  })

  it('parses self-message y from M command', () => {
    const self = seqGraph().messages.find((m) => m.id === 'i2')!
    expect(self.y).toBeCloseTo(203)
  })

  it('parses self-message loop height from Bezier C command', () => {
    const self = seqGraph().messages.find((m) => m.id === 'i2')!
    expect(self.selfLoopHeight).toBeCloseTo(20)
  })

  it('associates self-message label even when text y is above the loop start', () => {
    // text y=172 is 31px above msgY=203; document-order pairing resolves this
    const self = seqGraph().messages.find((m) => m.id === 'i2')!
    expect(self.label).toBe('think')
  })

  it('preserves viewBox from SVG root', () => {
    expect(seqGraph().viewBox).toBe('0 0 500 400')
  })

  it('gracefully ignores notes and loop text', () => {
    // notes/loops don't add to actors or messages — just verify counts stay correct
    expect(seqGraph().actors).toHaveLength(2)
    expect(seqGraph().messages).toHaveLength(3)
  })
})

describe('bootstrapGraph — unknown arrow marker', () => {
  it('defaults to solid and emits a console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const svg = `<svg viewBox="0 0 200 200">
      <line data-et="life-line" data-id="A" class="actor-line" x1="70" y1="50" x2="70" y2="200"/>
      <line data-et="life-line" data-id="B" class="actor-line" x1="150" y1="50" x2="150" y2="200"/>
      <line data-et="message" data-id="m0" data-from="A" data-to="B"
            class="messageLine0" x1="70" y1="100" x2="150" y2="100"
            marker-end="url(#some-unknown-marker)"/>
    </svg>`
    const graph = bootstrapGraph(svg) as SequenceGraph
    expect(graph.kind).toBe('sequence')
    expect(graph.messages[0].arrowKind).toBe('solid')
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[bootstrap]'),
      expect.stringContaining('some-unknown-marker'),
      expect.any(String),
    )
    warnSpy.mockRestore()
  })
})

describe('bootstrapGraph — flowchart discrimination regression', () => {
  it('does not detect a flowchart as sequence', () => {
    expect(bootstrapGraph(FLOWCHART_FIXTURE).kind).toBe('flowchart')
  })
})
