export async function loadImageFromSvgString(svgString: string): Promise<HTMLImageElement> {
  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
