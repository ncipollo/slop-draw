import { useCallback, useState } from 'react'
import { bootstrapGraph } from './bootstrap'
import type { DiagramGraph, DiagramNode, RoutingMode } from './graph'

type NodePatch = Partial<Omit<DiagramNode, 'id'>>

export type UseGraphStateResult = {
  graph: DiagramGraph | null
  dirty: boolean
  bootstrapFromSvg: (svgString: string) => void
  updateNode: (id: string, patch: NodePatch) => void
  setRouting: (mode: RoutingMode) => void
}

export function useGraphState(): UseGraphStateResult {
  const [graph, setGraph] = useState<DiagramGraph | null>(null)
  const [dirty, setDirty] = useState(false)

  const bootstrapFromSvg = useCallback((svgString: string) => {
    setGraph(bootstrapGraph(svgString))
    setDirty(false)
  }, [])

  const updateNode = useCallback((id: string, patch: NodePatch) => {
    setGraph((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      }
    })
    setDirty(true)
  }, [])

  const setRouting = useCallback((mode: RoutingMode) => {
    setGraph((prev) => (prev ? { ...prev, routing: mode } : prev))
    setDirty(true)
  }, [])

  return { graph, dirty, bootstrapFromSvg, updateNode, setRouting }
}
