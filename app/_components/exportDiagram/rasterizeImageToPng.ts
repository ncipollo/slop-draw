import { PNG_BACKGROUND, PNG_SCALE } from './constants'

export async function rasterizeImageToPng(
  img: HTMLImageElement,
  width: number,
  height: number,
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas')
  canvas.width = width * PNG_SCALE
  canvas.height = height * PNG_SCALE
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = PNG_BACKGROUND
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
  return new Uint8Array(await pngBlob.arrayBuffer())
}
