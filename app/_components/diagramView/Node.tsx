'use client'

import { useEffect, useRef } from 'react'
import type { DiagramNode } from './graph'
import styles from '../DiagramView.module.css'

type Props = {
  node: DiagramNode
  isSelected: boolean
  isEditing: boolean
  onPointerDown: (e: React.PointerEvent<SVGGElement>, id: string) => void
  onClick: (e: React.MouseEvent<SVGGElement>, id: string) => void
  onDoubleClick: (id: string) => void
  onLabelCommit: (id: string, label: string) => void
  onLabelCancel: () => void
}

function NodeShape({ node }: { node: DiagramNode }) {
  const { width: w, height: h } = node
  const cx = w / 2
  const cy = h / 2

  if (node.shape === 'diamond') {
    const pts = `${cx},0 ${w},${cy} ${cx},${h} 0,${cy}`
    return <polygon points={pts} />
  }
  if (node.shape === 'ellipse') {
    return <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} />
  }
  if (node.shape === 'roundRect') {
    return <rect width={w} height={h} rx={8} ry={8} />
  }
  if (node.shape === 'stadium') {
    return <rect width={w} height={h} rx={h / 2} ry={h / 2} />
  }
  return <rect width={w} height={h} />
}

export function Node({
  node,
  isSelected,
  isEditing,
  onPointerDown,
  onClick,
  onDoubleClick,
  onLabelCommit,
  onLabelCancel,
}: Props) {
  const editRef = useRef<HTMLDivElement>(null)
  const originalLabel = useRef(node.label)

  useEffect(() => {
    if (isEditing && editRef.current) {
      originalLabel.current = node.label
      editRef.current.focus()
      const range = document.createRange()
      range.selectNodeContents(editRef.current)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [isEditing, node.label])

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onLabelCommit(node.id, editRef.current?.textContent ?? node.label)
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onLabelCancel()
    }
  }

  function handleBlur() {
    if (isEditing) {
      onLabelCommit(node.id, editRef.current?.textContent ?? node.label)
    }
  }

  const selectedClass = isSelected ? ` ${styles.nodeSelected}` : ''
  const draggingClass = ''

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      className={`${styles.node}${selectedClass}${draggingClass}`}
      data-node-id={node.id}
      onPointerDown={(e) => onPointerDown(e, node.id)}
      onClick={(e) => onClick(e, node.id)}
      onDoubleClick={() => onDoubleClick(node.id)}
    >
      <NodeShape node={node} />
      <foreignObject x={0} y={0} width={node.width} height={node.height}>
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
              onKeyDown={handleEditKeyDown}
              onBlur={handleBlur}
            >
              {node.label}
            </div>
          ) : (
            node.label
          )}
        </div>
      </foreignObject>
    </g>
  )
}
