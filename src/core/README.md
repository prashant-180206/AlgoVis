# AlgoVis Core

The core is framework-independent TypeScript. It does not import React or Tauri APIs. The application feeds source text into the language pipeline and consumes immutable runtime snapshots for inspection and visualization. The visualization module is the only part of core that talks to a rendering library, and it is isolated behind the `VisualizationState` projection.

## Pipeline

```text
source -> Lexer -> Token[] -> Parser -> Program/AST -> Interpreter -> RuntimeSnapshot -> VisualizationProjector -> PixiRenderer
```

## Modules

- `language`: source locations, tokens, lexer, parser, and AST nodes for the JavaScript-like language.
- `interpreter`: evaluation of declarations, expressions, functions, classes, objects, arrays, calls, control flow, and assignments.
- `modules`: a source-only module registry and URL resolution for import declarations.
- `runtime`: scopes, environments, runtime values, class registries, call frames, snapshots, and snapshot history.
- `execution`: execution event types and the trace of observable operations.
- `visualization`: projection of snapshots into serializable visual objects, nested environment trees, and PixiJS drawing.

## Public entry point

`src/core/index.ts` re-exports the public core types. Prefer importing from `src/core` in application code rather than reaching into implementation files unnecessarily.

## Language support

The current language supports JavaScript-like:

- `let`, `const`, and `var` declarations.
- Numbers, strings, booleans, `null`, and `undefined`.
- Arrays, object literals, member access, and indexes.
- Arithmetic, comparisons, logical operators, unary operators, increments, and compound assignments.
- Functions, returns, blocks, `if`, `while`, `for`, `break`, and `continue`.
- Classes, constructors, methods, fields, `this`, and `new`.
- Top-level imports and optional `export` markers.
- Semicolons and braces.

It is an educational interpreter, not a full JavaScript engine. New syntax must be implemented through the lexer, AST, parser, interpreter, and runtime layers.

## Modules and imports

`ModuleRegistry` stores fetched module source by normalized URL. The host fetches the text; the interpreter parses and evaluates it. Module source is never passed to host JavaScript execution.

```js
import "./modules/setup.js";
import { Stack, Queue as Fifo } from "./modules/structures.js";
import * as structures from "./modules/structures.js";
```

Module paths resolve relative to the importing module, or to the registry's base URL for the entry program. Top-level module declarations are implicitly exported, and `export class` / `export function` / `export let` are accepted. Imported bindings are copied at import time, not live bindings.

Module initialization suppresses `Runtime.recordStep()` and interpreter events, so module setup does not add steps or misleading source lines to the main program trace. Module scopes are retained as environment kind `module`. The application recursively preloads imports and exposes a reload control; see `public/modules/structures.js` for a sample module.

## Runtime inspection contract

Use `RuntimeSnapshot` as the UI boundary. It contains globals, all retained environments, active call frames, frame history, source location, events, and a step index. Environment kinds are `global`, `module`, `function`, and `block`, and parent IDs form a forest rather than a flat list. Use `buildEnvironmentForest()` when a UI needs the nested representation. Runtime scopes and mutable runtime values should not be stored directly in React state.

`Runtime.steps` is the playback timeline: one snapshot per executed statement, captured before the statement runs. It includes nested statements in blocks, loops, and function bodies. Use `Interpreter.steps` for step-forward/back navigation and `RuntimeSnapshot.currentLocation` for the editor's current-line highlight. Use `Runtime.snapshots` when fine-grained per-event state is needed.

Host-provided bindings such as `console` are flagged with `builtin: true`; UIs should hide or group them separately from user variables.

When adding a mutable runtime value, update:

1. The `RuntimeValue` union.
2. `Runtime.copyValue()` for historical snapshots.
3. Runtime class registration and assignability where relevant.
4. The visualization projector if the value should be drawn.

## Visualization contract

`VisualizationProjector` converts snapshots into `VisualizationState` without exposing runtime internals to PixiJS. The state includes environment entries plus visual arrays, objects, and instances. There is no `VisualStack` or class-name special case; `Stack`, `Queue`, `LinkedList`, and `Tree` all use generic instance projection until a custom renderer is registered.

`PixiRenderer` supports:

- A nested environment forest with dim inactive ancestors and child blocks drawn inside parent blocks.
- Generic instance and object field panels with recursive, cycle-safe child projection.
- Array rendering with active index highlighting.
- `registerClassRenderer()` for Queue, LinkedList, Tree, or any other class-specific visual.
- `panBy()` and `resetView()` for large visual worlds.

`VisualizationStage` exposes a `configureRenderer` callback for registering class renderers during Pixi initialization.

`CanvasRenderer` is retained as a flat Canvas 2D fallback with the same projection contract.

Custom renderers should draw only from the projected visual object. Data-structure mutation belongs in runtime code.

## Development check

Run the full application validation with:

```powershell
pnpm build
```

For a feature smoke test, use the editor with a small program that creates a value, mutates it across semicolon-delimited statements, and inspects the runtime-state panel, current-line decoration, execution trace, and visualization step by step.
