import { useEffect, useState } from 'react'

type Props = {
  containerRef: React.RefObject<HTMLDivElement | null>
  source: string
  didPanRef: React.RefObject<boolean>
}

type UseNodeSelectionResult = {
  selectedNodeId: string | null
  onDiagramClick: (e: React.MouseEvent<HTMLDivElement>) => void
}

export function useNodeSelection({
  containerRef,
  source,
  didPanRef,
}: Props): UseNodeSelectionResult {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.querySelectorAll('g.node').forEach((el) => {
      el.classList.toggle('selected', el.id === selectedNodeId)
    })
  }, [selectedNodeId, source, containerRef])

  function onDiagramClick(e: React.MouseEvent<HTMLDivElement>) {
    if (didPanRef.current) {
      didPanRef.current = false
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

  return { selectedNodeId, onDiagramClick }
}
