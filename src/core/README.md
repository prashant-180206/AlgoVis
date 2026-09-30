# AlgoVis Core

The core is framework-independent TypeScript. It does not import React, Canvas components, or Tauri APIs. The application feeds source text into the language pipeline and consumes immutable runtime snapshots for inspection and visualization.

## Pipeline

```text
source -> Lexer -> Token[] -> Parser -> Program/AST -> Interpreter -> RuntimeSnapshot -> VisualizationProjector -> CanvasRenderer
```

## Modules

- `language`: source locations, tokens, lexer, parser, and AST nodes for the JavaScript-like language.
- `interpreter`: evaluation of declarations, expressions, functions, classes, objects, arrays, calls, control flow, and assignments.
- `runtime`: scopes, environments, runtime values, class registries, call frames, snapshots, and snapshot history.
- `execution`: execution event types and the trace of observable operations.
- `visualization`: projection of snapshots into serializable visual objects and Canvas 2D drawing.

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
- Semicolons and braces.

It is an educational interpreter, not a full JavaScript engine. New syntax must be implemented through the lexer, AST, parser, interpreter, and runtime layers.

## Runtime inspection contract

Use `RuntimeSnapshot` as the UI boundary. It contains globals, all retained environments, active call frames, frame history, source location, events, and a step index. Runtime scopes and mutable runtime values should not be stored directly in React state.

When adding a mutable runtime value, update:

1. The `RuntimeValue` union.
2. `Runtime.copyValue()` for historical snapshots.
3. Runtime class registration and assignability where relevant.
4. The visualization projector if the value should be drawn.

## Visualization contract

`VisualizationProjector` converts snapshots into `VisualizationState` without exposing runtime internals to Canvas. The state includes environment cards plus visual arrays, objects, instances, and reserved stack objects.

`CanvasRenderer` supports:

- Generic environment and field panels.
- Existing array rendering.
- Reserved stack rendering.
- `registerClassRenderer()` for future Queue, LinkedList, Tree, or other class-specific visuals.
- `panBy()` and `resetView()` for large visual worlds.

Custom renderers should draw only from the projected visual object. Data-structure mutation belongs in runtime code.

## Development check

Run the full application validation with:

```powershell
npm run build
```

For a feature smoke test, use the editor with a small program that creates a value, mutates it across semicolon-delimited statements, and inspects the runtime-state panel and visualization history.
