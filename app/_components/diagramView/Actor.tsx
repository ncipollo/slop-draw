'use client'

import { useEffect, useRef } from 'react'
import type { SequenceActor } from './graph'
import styles from '../DiagramView.module.css'

type Props = {
  actor: SequenceActor
  isSelected: boolean
  isEditing: boolean
  onPointerDown: (e: React.PointerEvent<SVGGElement>, id: string) => void
  onClick: (e: React.MouseEvent<SVGGElement>, id: string) => void
  onDoubleClick: (id: string) => void
  onLabelCommit: (id: string, label: string) => void
  onLabelCancel: () => void
}

function ActorBox({
  actor,
  isEditing,
  editRef,
  onEditKeyDown,
  onBlur,
}: {
  actor: SequenceActor
  isEditing: boolean
  editRef: React.RefObject<HTMLDivElement | null>
  onEditKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
  onBlur: () => void
}) {
  return (
    <g>
      <rect className={styles.actorBox} width={actor.width} height={actor.height} rx={4} />
      <foreignObject x={0} y={0} width={actor.width} height={actor.height}>
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          className={`${styles.nodeLabel}${isEditing ? ` ${styles.nodeLabelEditing}` : ''}`}
        >
          {isEditing ? (
            <div
              ref={editRef}
              contentEditable
              suppressContentEditableWarning
              className={styles.nodeLabelEdit}
              onKeyDown={onEditKeyDown}
              onBlur={onBlur}
            >
              {actor.label}
            </div>
          ) : (
            actor.label
          )}
        </div>
      </foreignObject>
    </g>
  )
}

export function Actor({
  actor,
  isSelected,
  isEditing,
  onPointerDown,
  onClick,
  onDoubleClick,
  onLabelCommit,
  onLabelCancel,
}: Props) {
  const editRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus()
      const range = document.createRange()
      range.selectNodeContents(editRef.current)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [isEditing])

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onLabelCommit(actor.id, editRef.current?.textContent ?? actor.label)
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onLabelCancel()
    }
  }

  function handleBlur() {
    if (isEditing) {
      onLabelCommit(actor.id, editRef.current?.textContent ?? actor.label)
    }
  }

  const cx = actor.x + actor.width / 2
  const selectedClass = isSelected ? ` ${styles.nodeSelected}` : ''

  return (
    <g
      className={`${styles.node}${selectedClass}`}
      data-actor-id={actor.id}
      onPointerDown={(e) => onPointerDown(e, actor.id)}
      onClick={(e) => onClick(e, actor.id)}
      onDoubleClick={() => onDoubleClick(actor.id)}
    >
      {/* Lifeline */}
      <line
        x1={cx}
        y1={actor.lifelineTopY}
        x2={cx}
        y2={actor.lifelineBottomY}
        stroke="var(--line-color)"
        strokeWidth={1}
        strokeDasharray="6 3"
      />

      {/* Top actor box */}
      <g transform={`translate(${actor.x}, ${actor.topY})`}>
        <ActorBox
          actor={actor}
          isEditing={isEditing}
          editRef={editRef}
          onEditKeyDown={handleEditKeyDown}
          onBlur={handleBlur}
        />
      </g>

      {/* Bottom actor box (mirror) — only render if bottomY differs from lifeline bottom */}
      {actor.bottomY < actor.lifelineBottomY && (
        <g transform={`translate(${actor.x}, ${actor.bottomY})`}>
          <rect className={styles.actorBox} width={actor.width} height={actor.height} rx={4} />
          <foreignObject x={0} y={0} width={actor.width} height={actor.height}>
            <div xmlns="http://www.w3.org/1999/xhtml" className={styles.nodeLabel}>
              {actor.label}
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  )
}
