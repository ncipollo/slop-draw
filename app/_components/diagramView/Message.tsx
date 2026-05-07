'use client'

import { useRef, useEffect } from 'react'
import type { SequenceActor, SequenceArrowKind, SequenceMessage } from './graph'
import styles from '../DiagramView.module.css'

const SELF_LOOP_WIDTH = 40

type Props = {
  message: SequenceMessage
  fromActor: SequenceActor
  toActor: SequenceActor
  isEditing: boolean
  onLabelDoubleClick: (id: string) => void
  onLabelCommit: (id: string, label: string) => void
  onLabelCancel: () => void
}

function markerUrl(kind: SequenceArrowKind): string {
  switch (kind) {
    case 'solidOpen':
    case 'dashedOpen':
      return 'url(#seq-arrow-open)'
    case 'cross':
    case 'dashedCross':
      return 'url(#seq-arrow-cross)'
    default:
      return 'url(#seq-arrow-filled)'
  }
}

function isDashed(kind: SequenceArrowKind): boolean {
  return kind === 'dashed' || kind === 'dashedOpen' || kind === 'dashedCross'
}

type MessageLabelProps = {
  message: SequenceMessage
  x: number
  y: number
  isEditing: boolean
  onDoubleClick: (id: string) => void
  onCommit: (id: string, label: string) => void
  onCancel: () => void
}

function MessageLabel({ message, x, y, isEditing, onDoubleClick, onCommit, onCancel }: MessageLabelProps) {
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

  if (!message.label && !isEditing) return null

  const labelW = Math.max(message.label.length * 7 + 12, 40)
  const labelH = 18

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onCommit(message.id, editRef.current?.textContent ?? message.label)
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  function handleBlur() {
    if (isEditing) {
      onCommit(message.id, editRef.current?.textContent ?? message.label)
    }
  }

  return (
    <g
      transform={`translate(${x - labelW / 2}, ${y - labelH / 2})`}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onDoubleClick(message.id)
      }}
      style={{ cursor: 'text' }}
    >
      <rect
        width={labelW}
        height={labelH}
        rx={3}
        fill="var(--background)"
        stroke="#9ca3af"
        strokeWidth={0.75}
      />
      {isEditing ? (
        <foreignObject x={2} y={1} width={labelW - 4} height={labelH - 2}>
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            ref={editRef}
            contentEditable
            suppressContentEditableWarning
            className={styles.nodeLabelEdit}
            style={{ fontSize: '11px', padding: '1px 3px' }}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
          >
            {message.label}
          </div>
        </foreignObject>
      ) : (
        <text
          x={labelW / 2}
          y={labelH / 2 + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11"
          fill="var(--foreground)"
        >
          {message.label}
        </text>
      )}
    </g>
  )
}

export function Message({
  message,
  fromActor,
  toActor,
  isEditing,
  onLabelDoubleClick,
  onLabelCommit,
  onLabelCancel,
}: Props) {
  const fromCx = fromActor.x + fromActor.width / 2
  const toCx = toActor.x + toActor.width / 2
  const dashed = isDashed(message.arrowKind)
  const strokeDasharray = dashed ? '6 3' : undefined

  const labelProps = {
    message,
    isEditing,
    onDoubleClick: onLabelDoubleClick,
    onCommit: onLabelCommit,
    onCancel: onLabelCancel,
  }

  if (message.isSelf) {
    const loopHeight = message.selfLoopHeight ?? 20
    const x2 = fromCx + SELF_LOOP_WIDTH
    const loopY2 = message.y + loopHeight
    const labelX = fromCx + SELF_LOOP_WIDTH / 2
    const labelY = message.y + loopHeight / 2

    return (
      <g>
        <path
          d={`M ${fromCx} ${message.y} H ${x2} V ${loopY2} H ${fromCx}`}
          fill="none"
          stroke="var(--line-color)"
          strokeWidth={1.5}
          markerEnd="url(#seq-arrow-open)"
        />
        <MessageLabel {...labelProps} x={labelX} y={labelY} />
      </g>
    )
  }

  const midX = (fromCx + toCx) / 2
  const labelY = message.y - 6

  return (
    <g>
      <line
        x1={fromCx}
        y1={message.y}
        x2={toCx}
        y2={message.y}
        stroke="var(--line-color)"
        strokeWidth={1.5}
        strokeDasharray={strokeDasharray}
        markerEnd={markerUrl(message.arrowKind)}
      />
      <MessageLabel {...labelProps} x={midX} y={labelY} />
    </g>
  )
}
