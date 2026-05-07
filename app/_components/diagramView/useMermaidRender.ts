import { useEffect } from 'react'
import { getMermaid, nextRenderId } from './mermaidLoader'

type Props = {
  source: string
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function useMermaidRender({ source, containerRef }: Props): void {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    const id = nextRenderId()
    getMermaid()
      .then((mermaid) => mermaid.render(id, source))
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
  }, [source, containerRef])
}
