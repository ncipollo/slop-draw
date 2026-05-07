'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './DiagramView.module.css'

// Lazily loaded to avoid Turbopack splitting mermaid into many small chunks
// that WKWebView can fail to fetch during initial page load.
let mermaidReady: Promise<typeof import('mermaid')['default']> | null = null
function getMermaid() {
  if (!mermaidReady) {
    mermaidReady = import('mermaid').then((mod) => {
      mod.default.initialize({ startOnLoad: false, securityLevel: 'loose' })
      return mod.default
    })
  }
  return mermaidReady
}

const SAMPLE_SOURCE = `flowchart TD
  A([Start]) --> B{Decision?}
  B -->|Yes| C[Do the thing]
  B -->|No| D[Do something else]
  C --> E([End])
  D --> E`

let renderCounter = 0

type PanState = {
  startX: number
  startY: number
  scrollLeft: number
  scrollTop: number
}

export function DiagramView() {
  const [committedSource, setCommittedSource] = useState(SAMPLE_SOURCE)
  const [draftSource, setDraftSource] = useState(SAMPLE_SOURCE)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const panState = useRef<PanState | null>(null)
  const lastPanMoved = useRef(false)

  // Render mermaid whenever committed source changes
  useEffect(() => {
    const container = svgContainerRef.current
    if (!container) return
    let cancelled = false
    const id = `mmd-${++renderCounter}`
    getMermaid()
      .then((mermaid) => mermaid.render(id, committedSource))
      .then(({ svg }) => {
        if (cancelled) return
        container.innerHTML = svg
      })
      .catch((err: unknown) => {
        if (cancelled) return
        container.innerHTML = `<pre class="mermaid-error">${String(err)}</pre>`
      })
    return () => {
      cancelled = true
    }
  }, [committedSource])

  // Apply / re-apply selection highlight after render or selection change
  useEffect(() => {
    const container = svgContainerRef.current
    if (!container) return
    container.querySelectorAll('g.node').forEach((el) => {
      el.classList.toggle('selected', el.id === selectedNodeId)
    })
  }, [selectedNodeId, committedSource])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      setCommittedSource(draftSource)
    }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    lastPanMoved.current = false
    const target = e.target as HTMLElement
    if (target.closest('g.node')) return
    panState.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: scrollerRef.current!.scrollLeft,
      scrollTop: scrollerRef.current!.scrollTop,
    }
    setIsPanning(true)
    e.preventDefault()
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!panState.current) return
    lastPanMoved.current = true
    scrollerRef.current!.scrollLeft =
      panState.current.scrollLeft - (e.clientX - panState.current.startX)
    scrollerRef.current!.scrollTop =
      panState.current.scrollTop - (e.clientY - panState.current.startY)
  }

  function handleMouseUp() {
    panState.current = null
    setIsPanning(false)
  }

  function handleDiagramClick(e: React.MouseEvent<HTMLDivElement>) {
    if (lastPanMoved.current) {
      lastPanMoved.current = false
      return
    }
    const node = (e.target as HTMLElement).closest('g.node')
    if (node) {
      const newId = node.id === selectedNodeId ? null : node.id
      setSelectedNodeId(newId)
    } else {
      setSelectedNodeId(null)
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={svgContainerRef}
          className={styles.diagram}
          onClick={handleDiagramClick}
        />
      </div>
    </div>
  )
}
