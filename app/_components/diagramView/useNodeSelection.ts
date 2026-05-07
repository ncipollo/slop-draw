import { useState } from 'react'

type Props = {
  didPanRef: React.RefObject<boolean>
}

type UseNodeSelectionResult = {
  selectedNodeId: string | null
  onNodeClick: (e: React.MouseEvent<SVGGElement>, id: string) => void
  clearSelection: () => void
}

export function useNodeSelection({ didPanRef }: Props): UseNodeSelectionResult {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  function onNodeClick(_e: React.MouseEvent<SVGGElement>, id: string) {
    if (didPanRef.current) {
      didPanRef.current = false
      return
    }
    setSelectedNodeId((prev) => (prev === id ? null : id))
  }

  function clearSelection() {
    setSelectedNodeId(null)
  }

  return { selectedNodeId, onNodeClick, clearSelection }
}
