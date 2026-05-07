export type NodeShape = 'rect' | 'roundRect' | 'diamond' | 'ellipse' | 'stadium'

export interface DiagramNode {
  id: string
  label: string
  shape: NodeShape
  x: number
  y: number
  width: number
  height: number
}

export interface DiagramEdge {
  id: string
  source: string
  target: string
  label?: string
}

export type RoutingMode = 'orthogonal' | 'bezier'

export interface FlowchartGraph {
  kind: 'flowchart'
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  routing: RoutingMode
  viewBox: string
}

export type SequenceArrowKind =
  | 'solid'
  | 'dashed'
  | 'solidOpen'
  | 'dashedOpen'
  | 'cross'
  | 'dashedCross'

export interface SequenceActor {
  id: string
  label: string
  x: number
  topY: number
  bottomY: number
  width: number
  height: number
  lifelineTopY: number
  lifelineBottomY: number
}

export interface SequenceMessage {
  id: string
  fromActor: string
  toActor: string
  y: number
  isSelf: boolean
  selfLoopHeight?: number
  label: string
  arrowKind: SequenceArrowKind
}

export interface SequenceGraph {
  kind: 'sequence'
  actors: SequenceActor[]
  messages: SequenceMessage[]
  viewBox: string
}

export type DiagramGraph = FlowchartGraph | SequenceGraph
