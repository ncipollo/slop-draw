export function svgToHtml(svgString: string, title: string): Uint8Array {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>body{margin:0;padding:24px;display:flex;justify-content:center;font-family:system-ui}</style>
</head>
<body>${svgString}</body>
</html>`
  return new TextEncoder().encode(html)
}
