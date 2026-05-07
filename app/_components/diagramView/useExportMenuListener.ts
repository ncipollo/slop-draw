import { useEffect } from 'react'
import { exportDiagram } from '../exportDiagram'

type Props = {
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function useExportMenuListener({ containerRef }: Props): void {
  useEffect(() => {
    let unlisten: (() => void) | null = null
    import('@tauri-apps/api/event')
      .then(({ listen }) =>
        listen('menu-export', () => {
          const svg = containerRef.current?.querySelector('svg') ?? null
          exportDiagram(svg as SVGSVGElement | null)
        }),
      )
      .then((fn) => {
        unlisten = fn
      })
      .catch(() => {
        /* not running in Tauri */
      })
    return () => {
      unlisten?.()
    }
  }, [containerRef])
}
