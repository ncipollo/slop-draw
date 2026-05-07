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

export interface DiagramGraph {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  routing: RoutingMode
  viewBox: string
}
