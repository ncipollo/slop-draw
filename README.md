# slop-draw

A desktop diagram editor for Mermaid flowcharts. Import a `.mmd` file, rearrange nodes on an infinite canvas, then export the result as a PNG.

## Core features

- Import a Mermaid diagram (`.mmd` / `.mermaid`)
- Move and reposition components on the canvas
- Export the final diagram as a PNG

## Development

```sh
pnpm install

pnpm dev          # web only (http://localhost:3000)
pnpm tauri:dev    # Tauri desktop window

pnpm test         # run tests
pnpm test:watch   # watch mode
pnpm lint         # lint
```

Built with [Tauri 2](https://tauri.app) + [Next.js](https://nextjs.org) + [Mermaid](https://mermaid.js.org).
