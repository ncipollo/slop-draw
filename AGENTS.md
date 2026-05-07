# Tauri App

Tauri 2 desktop app with a Rust backend (`src-tauri/`) and a Next.js frontend (`app/`). The frontend runs embedded in the Tauri webview — not in a browser. Use `pnpm tauri dev` to run locally.

# After Every Change

Always run the following commands after making any code change:

```
pnpm test
pnpm lint
```

Fix any failures before considering the task complete.
