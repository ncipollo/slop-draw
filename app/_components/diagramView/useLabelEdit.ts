import { useState } from 'react'
import type { UseGraphStateResult } from './useGraphState'

export type EditableKind = 'node' | 'actor' | 'message'

type EditingTarget = { id: string; kind: EditableKind }

type UseLabelEditResult = {
  editingTarget: EditingTarget | null
  editingNodeId: string | null
  editingActorId: string | null
  editingMessageId: string | null
  onNodeDoubleClick: (id: string) => void
  onActorDoubleClick: (id: string) => void
  onMessageLabelDoubleClick: (id: string) => void
  onLabelCommit: (id: string, label: string) => void
  onLabelCancel: () => void
}

type Props = {
  graphState: UseGraphStateResult
}

export function useLabelEdit({ graphState }: Props): UseLabelEditResult {
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null)

  function onNodeDoubleClick(id: string) {
    setEditingTarget({ id, kind: 'node' })
  }

  function onActorDoubleClick(id: string) {
    setEditingTarget({ id, kind: 'actor' })
  }

  function onMessageLabelDoubleClick(id: string) {
    setEditingTarget({ id, kind: 'message' })
  }

  function onLabelCommit(id: string, label: string) {
    const trimmed = label.trim() || id
    if (editingTarget?.kind === 'actor') {
      graphState.updateActor(id, { label: trimmed })
    } else if (editingTarget?.kind === 'message') {
      graphState.updateMessageLabel(id, trimmed)
    } else {
      graphState.updateNode(id, { label: trimmed })
    }
    setEditingTarget(null)
  }

  function onLabelCancel() {
    setEditingTarget(null)
  }

  return {
    editingTarget,
    editingNodeId: editingTarget?.kind === 'node' ? editingTarget.id : null,
    editingActorId: editingTarget?.kind === 'actor' ? editingTarget.id : null,
    editingMessageId: editingTarget?.kind === 'message' ? editingTarget.id : null,
    onNodeDoubleClick,
    onActorDoubleClick,
    onMessageLabelDoubleClick,
    onLabelCommit,
    onLabelCancel,
  }
}
