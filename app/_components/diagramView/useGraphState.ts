import { useCallback, useState } from 'react'
import { bootstrapGraph } from './bootstrap'
import type { DiagramGraph, DiagramNode, FlowchartGraph, RoutingMode, SequenceActor } from './graph'

type NodePatch = Partial<Omit<DiagramNode, 'id'>>
type ActorPatch = Partial<Pick<SequenceActor, 'x' | 'label'>>

export type UseGraphStateResult = {
  graph: DiagramGraph | null
  dirty: boolean
  bootstrapFromSvg: (svgString: string) => void
  updateNode: (id: string, patch: NodePatch) => void
  setRouting: (mode: RoutingMode) => void
  updateActor: (id: string, patch: ActorPatch) => void
  updateMessageLabel: (id: string, label: string) => void
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
      if (!prev || prev.kind !== 'flowchart') return prev
      return {
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      } satisfies FlowchartGraph
    })
    setDirty(true)
  }, [])

  const setRouting = useCallback((mode: RoutingMode) => {
    setGraph((prev) => {
      if (!prev || prev.kind !== 'flowchart') return prev
      return { ...prev, routing: mode } satisfies FlowchartGraph
    })
    setDirty(true)
  }, [])

  const updateActor = useCallback((id: string, patch: ActorPatch) => {
    setGraph((prev) => {
      if (!prev || prev.kind !== 'sequence') return prev
      return {
        ...prev,
        actors: prev.actors.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      }
    })
    setDirty(true)
  }, [])

  const updateMessageLabel = useCallback((id: string, label: string) => {
    setGraph((prev) => {
      if (!prev || prev.kind !== 'sequence') return prev
      return {
        ...prev,
        messages: prev.messages.map((m) => (m.id === id ? { ...m, label } : m)),
      }
    })
    setDirty(true)
  }, [])

  return { graph, dirty, bootstrapFromSvg, updateNode, setRouting, updateActor, updateMessageLabel }
}
