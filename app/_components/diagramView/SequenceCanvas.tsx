'use client'

import type { SequenceGraph } from './graph'
import { Actor } from './Actor'
import { Message } from './Message'

type Props = {
  graph: SequenceGraph
  selectedActorId: string | null
  editingActorId: string | null
  editingMessageId: string | null
  onActorPointerDown: (e: React.PointerEvent<SVGGElement>, id: string) => void
  onActorClick: (e: React.MouseEvent<SVGGElement>, id: string) => void
  onActorDoubleClick: (id: string) => void
  onMessageLabelDoubleClick: (id: string) => void
  onLabelCommit: (id: string, label: string) => void
  onLabelCancel: () => void
  onSvgPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void
  onSvgPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void
}

export function SequenceCanvas({
  graph,
  selectedActorId,
  editingActorId,
  editingMessageId,
  onActorPointerDown,
  onActorClick,
  onActorDoubleClick,
  onMessageLabelDoubleClick,
  onLabelCommit,
  onLabelCancel,
  onSvgPointerMove,
  onSvgPointerUp,
}: Props) {
  const actorIndex = new Map(graph.actors.map((a) => [a.id, a]))

  return (
    <svg
      viewBox={graph.viewBox}
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
      onPointerMove={onSvgPointerMove}
      onPointerUp={onSvgPointerUp}
    >
      <defs>
        {/* Solid filled arrowhead */}
        <marker id="seq-arrow-filled" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--line-color)" />
        </marker>
        {/* Solid open (chevron) arrowhead */}
        <marker id="seq-arrow-open" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polyline points="0 0, 10 3.5, 0 7" fill="none" stroke="var(--line-color)" strokeWidth="1.5" />
        </marker>
        {/* Cross arrowhead */}
        <marker id="seq-arrow-cross" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
          <line x1="0" y1="0" x2="10" y2="10" stroke="var(--line-color)" strokeWidth="1.5" />
          <line x1="10" y1="0" x2="0" y2="10" stroke="var(--line-color)" strokeWidth="1.5" />
        </marker>
        {/* Dashed variants use the same markers; stroke-dasharray is on the line itself */}
        <marker id="seq-arrow-filled-dashed" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--line-color)" />
        </marker>
        <marker id="seq-arrow-open-dashed" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polyline points="0 0, 10 3.5, 0 7" fill="none" stroke="var(--line-color)" strokeWidth="1.5" />
        </marker>
        <marker id="seq-arrow-cross-dashed" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
          <line x1="0" y1="0" x2="10" y2="10" stroke="var(--line-color)" strokeWidth="1.5" />
          <line x1="10" y1="0" x2="0" y2="10" stroke="var(--line-color)" strokeWidth="1.5" />
        </marker>
      </defs>

      <g className="messages">
        {graph.messages.map((msg) => {
          const from = actorIndex.get(msg.fromActor)
          const to = actorIndex.get(msg.toActor)
          if (!from || !to) return null
          return (
            <Message
              key={msg.id}
              message={msg}
              fromActor={from}
              toActor={to}
              isEditing={msg.id === editingMessageId}
              onLabelDoubleClick={onMessageLabelDoubleClick}
              onLabelCommit={onLabelCommit}
              onLabelCancel={onLabelCancel}
            />
          )
        })}
      </g>

      <g className="actors">
        {graph.actors.map((actor) => (
          <Actor
            key={actor.id}
            actor={actor}
            isSelected={actor.id === selectedActorId}
            isEditing={actor.id === editingActorId}
            onPointerDown={onActorPointerDown}
            onClick={onActorClick}
            onDoubleClick={onActorDoubleClick}
            onLabelCommit={onLabelCommit}
            onLabelCancel={onLabelCancel}
          />
        ))}
      </g>
    </svg>
  )
}
