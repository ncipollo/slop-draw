import { useEffect } from 'react'
import { getMermaid, nextRenderId } from './mermaidLoader'

type Props = {
  source: string
  onRendered: (svgString: string) => void
  onError: (message: string) => void
}

export function useMermaidRender({ source, onRendered, onError }: Props): void {
  useEffect(() => {
    let cancelled = false
    const id = nextRenderId()
    const scratch = document.createElement('div')
    document.body.appendChild(scratch)

    getMermaid()
      .then((mermaid) => mermaid.render(id, source, scratch))
      .then(({ svg }) => {
        if (cancelled) return
        onRendered(svg)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        onError(String(err))
      })
      .finally(() => {
        if (scratch.parentNode) scratch.parentNode.removeChild(scratch)
      })

    return () => {
      cancelled = true
    }
  }, [source, onRendered, onError])
}
