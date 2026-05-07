import { useCallback, useEffect, useState } from 'react'

type UseZoomResult = {
  zoom: number
  zoomIn: () => void
  zoomOut: () => void
  zoomReset: () => void
  handleZoomWheel: (e: React.WheelEvent) => void
}

const ZOOM_MIN = 0.1
const ZOOM_MAX = 5
const ZOOM_STEP = 0.1

export function useZoom(): UseZoomResult {
  const [zoom, setZoom] = useState(1)

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + ZOOM_STEP, ZOOM_MAX))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - ZOOM_STEP, ZOOM_MIN))
  }, [])

  const zoomReset = useCallback(() => {
    setZoom(1)
  }, [])

  const handleZoomWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        if (e.deltaY < 0) {
          zoomIn()
        } else {
          zoomOut()
        }
      }
    },
    [zoomIn, zoomOut],
  )

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return
      const active = document.activeElement
      if (active && (active as HTMLElement).isContentEditable) return

      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        zoomIn()
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        zoomOut()
      } else if (e.key === '0') {
        e.preventDefault()
        zoomReset()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [zoomIn, zoomOut, zoomReset])

  return { zoom, zoomIn, zoomOut, zoomReset, handleZoomWheel }
}
