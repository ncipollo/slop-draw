'use client'

import type { DiagramGraph } from './graph'
import { Node } from './Node'
import { Edge } from './Edge'

type Props = {
  graph: DiagramGraph
  selectedNodeId: string | null
  editingNodeId: string | null
  onNodePointerDown: (e: React.PointerEvent<SVGGElement>, id: string) => void
  onNodeClick: (e: React.MouseEvent<SVGGElement>, id: string) => void
  onNodeDoubleClick: (id: string) => void
  onLabelCommit: (id: string, label: string) => void
  onLabelCancel: () => void
  onSvgPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void
  onSvgPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void
}

export function DiagramCanvas({
  graph,
  selectedNodeId,
  editingNodeId,
  onNodePointerDown,
  onNodeClick,
  onNodeDoubleClick,
  onLabelCommit,
  onLabelCancel,
  onSvgPointerMove,
  onSvgPointerUp,
}: Props) {
  const nodeIndex = new Map(graph.nodes.map((n) => [n.id, n]))

  return (
    <svg
      viewBox={graph.viewBox}
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
      onPointerMove={onSvgPointerMove}
      onPointerUp={onSvgPointerUp}
    >
      <defs>
        <marker
          id="arrow"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#9333ea" />
        </marker>
      </defs>
      <g className="edges">
        {graph.edges.map((edge) => {
          const src = nodeIndex.get(edge.source)
          const tgt = nodeIndex.get(edge.target)
          if (!src || !tgt) return null
          return (
            <Edge
              key={edge.id}
              edge={edge}
              sourceNode={src}
              targetNode={tgt}
              routing={graph.routing}
            />
          )
        })}
      </g>
      <g className="nodes">
        {graph.nodes.map((node) => (
          <Node
            key={node.id}
            node={node}
            isSelected={node.id === selectedNodeId}
            isEditing={node.id === editingNodeId}
            onPointerDown={onNodePointerDown}
            onClick={onNodeClick}
            onDoubleClick={onNodeDoubleClick}
            onLabelCommit={onLabelCommit}
            onLabelCancel={onLabelCancel}
          />
        ))}
      </g>
    </svg>
  )
}
