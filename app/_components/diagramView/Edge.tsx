'use client'

import type { DiagramEdge, DiagramNode, RoutingMode } from './graph'
import { buildPathD } from './routing'

type Props = {
  edge: DiagramEdge
  sourceNode: DiagramNode
  targetNode: DiagramNode
  routing: RoutingMode
}

export function Edge({ edge, sourceNode, targetNode, routing }: Props) {
  const d = buildPathD(sourceNode, targetNode, routing)
  const midX = (sourceNode.x + sourceNode.width / 2 + targetNode.x + targetNode.width / 2) / 2
  const midY = (sourceNode.y + sourceNode.height / 2 + targetNode.y + targetNode.height / 2) / 2

  return (
    <>
      <path
        d={d}
        fill="none"
        stroke="var(--line-color)"
        strokeWidth={2}
        markerEnd="url(#arrow)"
      />
      {edge.label && (
        <g transform={`translate(${midX}, ${midY})`}>
          <rect
            x={-(edge.label.length * 3.5 + 6)}
            y={-9}
            width={edge.label.length * 7 + 12}
            height={18}
            rx={3}
            fill="var(--background)"
            stroke="#9ca3af"
            strokeWidth={0.75}
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fill="var(--foreground)"
          >
            {edge.label}
          </text>
        </g>
      )}
    </>
  )
}
