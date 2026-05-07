import { svgToString } from './svgToString'
import { svgToHtml } from './svgToHtml'

type Exporter = {
  filePath: string
  encode(): Promise<Uint8Array>
}

export function chooseExporter(filePath: string, svg: SVGSVGElement): Exporter {
  const ext = filePath.toLowerCase().split('.').pop()

  if (ext === 'svg') {
    return {
      filePath,
      async encode() {
        return new TextEncoder().encode(svgToString(svg))
      },
    }
  }

  const stem = filePath.split('/').pop()!.replace(/\.html?$/i, '')
  return {
    filePath,
    async encode() {
      return svgToHtml(svgToString(svg), stem)
    },
  }
}
