'use client'

import { useRef, useState } from 'react'
import styles from './DiagramView.module.css'
import { SAMPLE_SOURCE } from './diagramView/constants'
import { useMermaidRender } from './diagramView/useMermaidRender'
import { usePan } from './diagramView/usePan'
import { useNodeSelection } from './diagramView/useNodeSelection'
import { useExportMenuListener } from './diagramView/useExportMenuListener'

export function DiagramView() {
  const [committedSource, setCommittedSource] = useState(SAMPLE_SOURCE)
  const [draftSource, setDraftSource] = useState(SAMPLE_SOURCE)
  const svgContainerRef = useRef<HTMLDivElement>(null)

  useMermaidRender({ source: committedSource, containerRef: svgContainerRef })
  const { scrollerRef, isPanning, didPanRef, handlers: panHandlers } = usePan()
  const { selectedNodeId, onDiagramClick } = useNodeSelection({
    containerRef: svgContainerRef,
    source: committedSource,
    didPanRef,
  })
  useExportMenuListener({ containerRef: svgContainerRef })

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      setCommittedSource(draftSource)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <textarea
          className={styles.textarea}
          value={draftSource}
          onChange={(e) => setDraftSource(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          aria-label="Mermaid source"
        />
        <div className={styles.toolbarActions}>
          <button className={styles.renderButton} onClick={() => setCommittedSource(draftSource)}>
            Render
          </button>
          {selectedNodeId && (
            <span className={styles.selectedLabel}>Selected: {selectedNodeId}</span>
          )}
        </div>
      </div>
      <div
        ref={scrollerRef}
        className={`${styles.scroller}${isPanning ? ` ${styles.panning}` : ''}`}
        onMouseDown={panHandlers.onMouseDown}
        onMouseMove={panHandlers.onMouseMove}
        onMouseUp={panHandlers.onMouseUp}
        onMouseLeave={panHandlers.onMouseUp}
      >
        <div
          ref={svgContainerRef}
          className={styles.diagram}
          onClick={onDiagramClick}
        />
      </div>
    </div>
  )
}
