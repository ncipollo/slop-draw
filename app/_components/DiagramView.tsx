'use client'

import { useCallback, useRef, useState } from 'react'
import styles from './DiagramView.module.css'
import { SAMPLE_SOURCE } from './diagramView/constants'
import { useMermaidRender } from './diagramView/useMermaidRender'
import { usePan } from './diagramView/usePan'
import { useNodeSelection } from './diagramView/useNodeSelection'
import { useExportMenuListener } from './diagramView/useExportMenuListener'
import { useGraphState } from './diagramView/useGraphState'
import { useNodeDrag } from './diagramView/useNodeDrag'
import { useLabelEdit } from './diagramView/useLabelEdit'
import { DiagramCanvas } from './diagramView/DiagramCanvas'
import type { DiagramGraph, RoutingMode } from './diagramView/graph'

type RoutingToggleProps = {
  graph: DiagramGraph
  onSetRouting: (mode: RoutingMode) => void
}

function RoutingToggle({ graph, onSetRouting }: RoutingToggleProps) {
  const isSequence = graph.kind === 'sequence'
  const activeRouting = graph.kind === 'flowchart' ? graph.routing : null
  const disabledTitle = 'Routing only applies to flowchart edges'

  return (
    <div className={styles.routingToggle}>
      <button
        className={`${styles.routingButton}${activeRouting === 'orthogonal' ? ` ${styles.routingButtonActive}` : ''}`}
        onClick={() => onSetRouting('orthogonal')}
        disabled={isSequence}
        title={isSequence ? disabledTitle : 'Orthogonal routing'}
      >
        ⌐
      </button>
      <button
        className={`${styles.routingButton}${activeRouting === 'bezier' ? ` ${styles.routingButtonActive}` : ''}`}
        onClick={() => onSetRouting('bezier')}
        disabled={isSequence}
        title={isSequence ? disabledTitle : 'Bezier routing'}
      >
        ∿
      </button>
    </div>
  )
}

export function DiagramView() {
  const [draftSource, setDraftSource] = useState(SAMPLE_SOURCE)
  const [committedSource, setCommittedSource] = useState(SAMPLE_SOURCE)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const svgContainerRef = useRef<HTMLDivElement>(null)

  const graphState = useGraphState()

  const onRendered = useCallback(
    (svgString: string) => {
      setErrorMessage(null)
      graphState.bootstrapFromSvg(svgString)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graphState.bootstrapFromSvg],
  )

  const onError = useCallback((msg: string) => {
    setErrorMessage(msg)
  }, [])

  useMermaidRender({ source: committedSource, onRendered, onError })

  const { scrollerRef, isPanning, didPanRef, handlers: panHandlers } = usePan()
  const { selectedNodeId, onNodeClick, clearSelection } = useNodeSelection({ didPanRef })
  const { onNodePointerDown, onActorPointerDown, onSvgPointerMove, onSvgPointerUp } = useNodeDrag({ graphState })
  const {
    editingNodeId,
    editingActorId,
    editingMessageId,
    onNodeDoubleClick,
    onActorDoubleClick,
    onMessageLabelDoubleClick,
    onLabelCommit,
    onLabelCancel,
  } = useLabelEdit({ graphState })

  useExportMenuListener({ containerRef: svgContainerRef })

  function handleRender() {
    if (graphState.dirty && graphState.graph) {
      if (!window.confirm('Re-rendering will discard your edits. Continue?')) return
    }
    clearSelection()
    setCommittedSource(draftSource)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleRender()
    }
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as Element
    if (!target.closest('[data-node-id]') && !target.closest('[data-actor-id]')) {
      clearSelection()
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
          <button className={styles.renderButton} onClick={handleRender}>
            Render
          </button>
          {graphState.graph && (
            <RoutingToggle graph={graphState.graph} onSetRouting={graphState.setRouting} />
          )}
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
          onClick={handleCanvasClick}
        >
          {errorMessage && <pre className={styles.diagramError}>{errorMessage}</pre>}
          {!errorMessage && graphState.graph && (
            <DiagramCanvas
              graph={graphState.graph}
              selectedNodeId={selectedNodeId}
              editingNodeId={editingNodeId}
              editingActorId={editingActorId}
              editingMessageId={editingMessageId}
              onNodePointerDown={onNodePointerDown}
              onActorPointerDown={onActorPointerDown}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              onActorDoubleClick={onActorDoubleClick}
              onMessageLabelDoubleClick={onMessageLabelDoubleClick}
              onLabelCommit={onLabelCommit}
              onLabelCancel={onLabelCancel}
              onSvgPointerMove={onSvgPointerMove}
              onSvgPointerUp={onSvgPointerUp}
            />
          )}
          {!graphState.graph && !errorMessage && (
            <div className={styles.emptyState}>
              Enter a Mermaid diagram above and click Render
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
