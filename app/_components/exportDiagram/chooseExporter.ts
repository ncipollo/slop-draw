import { getSvgPixelSize } from './getSvgPixelSize'
import { svgToString } from './svgToString'
import { svgToHtml } from './svgToHtml'
import { loadImageFromSvgString } from './loadImageFromSvgString'
import { rasterizeImageToPng } from './rasterizeImageToPng'

type Exporter = {
  filePath: string
  encode(): Promise<Uint8Array>
}

export function chooseExporter(filePath: string, svg: SVGSVGElement): Exporter {
  const ext = filePath.toLowerCase().split('.').pop()
  const svgString = svgToString(svg)

  if (ext === 'svg') {
    return {
      filePath,
      async encode() {
        return new TextEncoder().encode(svgString)
      },
    }
  }

  if (ext === 'html' || ext === 'htm') {
    const stem = filePath.split('/').pop()!.replace(/\.html?$/i, '')
    return {
      filePath,
      async encode() {
        return svgToHtml(svgString, stem)
      },
    }
  }

  const resolvedPath = ext !== 'png' ? filePath + '.png' : filePath
  const { width, height } = getSvgPixelSize(svg)
  return {
    filePath: resolvedPath,
    async encode() {
      const img = await loadImageFromSvgString(svgString)
      return rasterizeImageToPng(img, width, height)
    },
  }
}
