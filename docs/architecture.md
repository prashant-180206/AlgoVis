# AlgoVis Architecture

AlgoVis is a custom algorithm language. It does not execute Python and the Rust/Tauri layer is not the language runtime.

```text
source -> Lexer -> Parser -> AST -> Interpreter -> Runtime + ExecutionTrace -> UI / renderer
```

## Boundaries

- `src/core/language` owns source locations, tokens, the lexer, parser, and AST classes.
- `src/core/runtime` owns scopes, runtime values, arrays, call frames, and snapshots.
- `src/core/execution` owns the event vocabulary and event history.
- `src/core/interpreter` owns evaluation and stepping. It may depend on language and runtime, but never on React, Canvas, or Tauri.
- `src/core/visualization` converts runtime snapshots into renderer-safe objects and draws them with Canvas 2D.
- `src/App.tsx` observes the core. It must not evaluate AST nodes or mutate runtime objects directly.

## Adding a language feature

1. Add token types and keyword mappings in `Token.ts` and `Lexer.ts`.
2. Add an AST class in `Ast.ts` with a `SourceLocation`.
3. Teach `Parser.ts` to construct the node. Keep syntax errors as `ParserError` with a location.
4. Add evaluation in `Interpreter.ts` or extract a dedicated evaluator when the feature grows.
5. Emit an `ExecutionEvent` for an observable operation. The payload should contain stable identifiers such as `structureId`, `index`, or `name`, not UI objects.
6. Add a focused runtime smoke test before wiring a panel or renderer.

A feature is incomplete until it has syntax, AST representation, runtime semantics, an observable event where appropriate, and a testable error path.

## Adding a runtime data structure

Create a class in `src/core/runtime` rather than a React component. The class should own computational state and expose small operations:

```ts
export class StackValue {
  public constructor(public readonly id: string, private readonly items: RuntimeValue[] = []) {}

  public push(value: RuntimeValue): void { this.items.push(value); }
  public pop(): RuntimeValue { /* validate empty state, then remove */ }
  public snapshot(): readonly RuntimeValue[] { return [...this.items]; }
}
```

Represent the value in the `RuntimeValue` union, install a language builtin that creates it, and emit events from operations such as `PUSH` and `POP`. A renderer should consume a serializable visualization projection later; it should not receive the class instance.

## Adding a visualization

Keep three concepts separate:

1. Runtime value: mutable computational object such as `ArrayValue`.
2. Execution event: what happened, such as `COMPARE`, `SWAP`, or `PUSH`.
3. Visualization projection: serializable data needed by a renderer, such as values and active indices.

The Canvas renderer can map a projection to pixels, but it must never infer algorithm intent from values. If an index is being compared, the interpreter emits that fact.

The current implementation uses `VisualizationProjector` to turn `RuntimeSnapshot.globals` into `VisualizationState`, then passes that state to `CanvasRenderer`. To add a new structure, add a discriminated object to `VisualizationState`, project the corresponding runtime value, and add a renderer method. Keep the renderer input serializable and independent of `Scope`, `ArrayValue`, and AST classes.

## Stepping and history

`Interpreter.step()` advances one statement execution for the current milestone. It returns a `RuntimeSnapshot` containing the current source location, globals, call stack, and trace. The next execution milestone can replace the statement cursor with an explicit continuation stack without changing the UI contract.

When history is added, store immutable snapshots or event-plus-checkpoint pairs. Do not expose mutable `Scope` or `ArrayValue` instances to React state.

## Design rules

- Keep runtime state explicit; avoid module-level mutable state.
- Preserve deterministic execution for the same source and initial state.
- Prefer discriminated event types and typed payloads over `any`.
- Use source locations on every AST node and emitted event that corresponds to source code.
- Add dependencies only when they solve a concrete problem at the current milestone.
