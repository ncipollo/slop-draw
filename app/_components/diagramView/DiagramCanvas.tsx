'use client'

import type { DiagramGraph } from './graph'
import { Node } from './Node'
import { Edge } from './Edge'
import { SequenceCanvas } from './SequenceCanvas'

type Props = {
  graph: DiagramGraph
  selectedNodeId: string | null
  editingNodeId: string | null
  editingActorId: string | null
  editingMessageId: string | null
  onNodePointerDown: (e: React.PointerEvent<SVGGElement>, id: string) => void
  onActorPointerDown: (e: React.PointerEvent<SVGGElement>, id: string) => void
  onNodeClick: (e: React.MouseEvent<SVGGElement>, id: string) => void
  onNodeDoubleClick: (id: string) => void
  onActorDoubleClick: (id: string) => void
  onMessageLabelDoubleClick: (id: string) => void
  onLabelCommit: (id: string, label: string) => void
  onLabelCancel: () => void
  onSvgPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void
  onSvgPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void
}

export function DiagramCanvas({
  graph,
  selectedNodeId,
  editingNodeId,
  editingActorId,
  editingMessageId,
  onNodePointerDown,
  onActorPointerDown,
  onNodeClick,
  onNodeDoubleClick,
  onActorDoubleClick,
  onMessageLabelDoubleClick,
  onLabelCommit,
  onLabelCancel,
  onSvgPointerMove,
  onSvgPointerUp,
}: Props) {
  if (graph.kind === 'sequence') {
    return (
      <SequenceCanvas
        graph={graph}
        selectedActorId={selectedNodeId}
        editingActorId={editingActorId}
        editingMessageId={editingMessageId}
        onActorPointerDown={onActorPointerDown}
        onActorClick={onNodeClick}
        onActorDoubleClick={onActorDoubleClick}
        onMessageLabelDoubleClick={onMessageLabelDoubleClick}
        onLabelCommit={onLabelCommit}
        onLabelCancel={onLabelCancel}
        onSvgPointerMove={onSvgPointerMove}
        onSvgPointerUp={onSvgPointerUp}
      />
    )
  }

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
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--line-color)" />
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
