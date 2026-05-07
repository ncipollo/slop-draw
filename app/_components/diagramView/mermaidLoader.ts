let mermaidReady: Promise<typeof import('mermaid')['default']> | null = null

// Lazily loaded to avoid Turbopack splitting mermaid into many small chunks
// that WKWebView can fail to fetch during initial page load.
export function getMermaid(): Promise<typeof import('mermaid')['default']> {
  if (!mermaidReady) {
    mermaidReady = import('mermaid').then((mod) => {
      mod.default.initialize({ startOnLoad: false, securityLevel: 'loose' })
      return mod.default
    })
  }
  return mermaidReady
}

export let renderCounter = 0

export function nextRenderId(): string {
  return `mmd-${++renderCounter}`
}
