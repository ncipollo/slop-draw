# Tauri App

Tauri 2 desktop app with a Rust backend (`src-tauri/`) and a Next.js frontend (`app/`). The frontend runs embedded in the Tauri webview — not in a browser. Use `pnpm tauri dev` to run locally.


# Web

## After Every Change

Always run the following commands after making any code change:

```
pnpm test
pnpm lint
```

Fix any failures before considering the task complete.

# Rust

## After Each Change
Run the following commands after every code change and fix any issues before considering the change complete:

1. `cargo fmt` - Format all code
2. `cargo test` - Run all tests
3. `cargo clippy` - Run linter; fix all warnings and errors before completing the change

### Fixing Clippy Complexity Warnings
When clippy reports `cognitive_complexity`, `too_many_lines`, or `too_many_arguments` warnings, fix them by refactoring — never suppress with `#[allow]`:
- Extract logical sub-steps into well-named helper functions.
- When a file accumulates many functions, reorganize into helper files and structs (following the module conventions below).

## Dependencies
Always use exact versions for dependencies in `Cargo.toml` (e.g., `"4.5.60"` not `"4"`). Check `Cargo.lock` for the resolved version when pinning.

## Module Conventions
Never use `mod.rs`. Always use the modern Rust style: create a top-level file (e.g., `foo.rs`) as the module root, and a matching folder (`foo/`) for any submodules.

## Import Style
Always import symbols at the top of the file with `use` statements. Never call items using their full `crate::` namespace inline in function bodies or signatures. For example:

```rust
// Correct
use crate::feature::task::listing;
listing::list_open_tasks(...)

// Wrong
crate::feature::task::listing::list_open_tasks(...)
