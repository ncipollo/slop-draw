import { useState } from 'react'
import type { UseGraphStateResult } from './useGraphState'

type UseLabelEditResult = {
  editingNodeId: string | null
  onNodeDoubleClick: (id: string) => void
  onLabelCommit: (id: string, label: string) => void
  onLabelCancel: () => void
}

type Props = {
  graphState: UseGraphStateResult
}

export function useLabelEdit({ graphState }: Props): UseLabelEditResult {
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)

  function onNodeDoubleClick(id: string) {
    setEditingNodeId(id)
  }

  function onLabelCommit(id: string, label: string) {
    graphState.updateNode(id, { label: label.trim() || id })
    setEditingNodeId(null)
  }

  function onLabelCancel() {
    setEditingNodeId(null)
  }

  return { editingNodeId, onNodeDoubleClick, onLabelCommit, onLabelCancel }
}
