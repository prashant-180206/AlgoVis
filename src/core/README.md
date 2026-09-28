# Algorithm language core

The core is independent of React, Canvas, and Tauri.

- `language`: source locations, tokens, lexer, and AST node classes.
- `runtime`: scopes, runtime values, call frames, and explicit state.
- `execution`: observable events and the execution trace.
- `interpreter`: deterministic evaluation, built-ins, event emission, and stepping over a parsed `Program`.
- `visualization`: runtime-to-renderer projections and the Canvas 2D renderer.

The current milestone executes literals, arrays, identifiers, assignments, binary operators, indexing, and calls to the initial built-ins (`Array`, `len`, and `compare`). Control flow, user-defined functions, and additional data structures should be added incrementally.

See [`docs/architecture.md`](../../docs/architecture.md) for the extension workflow and the separation between runtime values, execution events, and renderer projections.
