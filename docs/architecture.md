# AlgoVis Architecture

AlgoVis is a small interpreted algorithm language with a separate runtime and visualization pipeline. It does not execute JavaScript, Python, or Rust. The syntax is JavaScript-like, but all execution is implemented by the TypeScript core.

```text
source
  -> Lexer
  -> tokens
  -> Parser
  -> AST
  -> Interpreter
  -> Runtime + ExecutionTrace + RuntimeSnapshots
  -> VisualizationProjector
  -> VisualizationState
  -> CanvasRenderer
```

## Boundaries

- `src/core/language` owns source locations, tokens, lexical analysis, parsing, and AST nodes.
- `src/core/interpreter` evaluates AST nodes, creates scopes, invokes functions and methods, and controls execution status.
- `src/core/runtime` owns values, scopes, classes, call frames, event history, snapshots, and retained environments.
- `src/core/execution` defines observable execution events and the event trace.
- `src/core/visualization` converts runtime snapshots into renderer-safe state and draws that state with Canvas 2D.
- `src/App.tsx` coordinates editing, execution history, snapshot selection, and canvas rendering. React does not evaluate AST nodes or mutate runtime values directly.
- `src-tauri` provides the desktop shell. It is not part of the language runtime.

The core is exported through `src/core/index.ts`, so application code can import the public language, runtime, interpreter, and visualization APIs from one module.

## Current language

The language uses JavaScript-like delimiters and control-flow syntax:

```js
class Stack {
  constructor() { this.items = []; }
  push(value) { this.items.push(value); }
  pop() { return this.items.pop(); }
}

let stack = new Stack();
stack.push(10);
let top = stack.pop();
```

The current syntax includes:

- Literals: numbers, strings, booleans, `null`, and `undefined`.
- Identifiers, `this`, arrays, and object literals.
- `let`, `const`, and `var` declarations.
- Assignments and compound assignments: `=`, `+=`, `-=`, `*=`, `/=`.
- Arithmetic, comparison, equality, logical, unary, increment, and decrement operators.
- Calls, member access, and index access.
- Functions, returns, blocks, `if`/`else`, `while`, `for`, `break`, and `continue`.
- Classes, constructors, methods, instances, `new`, and instance fields.
- Semicolons as explicit statement separators and execution boundaries for top-level stepping.

This is an intentionally small language, not a complete ECMAScript implementation. Unsupported JavaScript features should be added through the language pipeline rather than evaluated with `eval`.

## Core modules

### Language

`src/core/language/SourceLocation.ts` defines `SourcePosition` and `SourceLocation`. Every token and AST node carries a source range so parser, interpreter, and UI errors can point back to the editor.

`Token.ts` defines `TokenType` and immutable `Token` values. The token set includes keywords, literals, operators, delimiters, braces, brackets, dots, commas, colons, newlines, semicolons, and EOF.

`Lexer.ts` converts source text into tokens. It handles whitespace, line comments, block comments, numbers, quoted strings with basic escapes, identifiers, keyword lookup, and longest-match operator recognition. Keyword lookup must use own-property checks so identifiers such as `constructor` and `toString` cannot accidentally resolve through `Object.prototype`.

`Ast.ts` contains the syntax tree. Expressions include literals, identifiers, `this`, arrays, objects, unary/binary operators, calls, indexes, members, and `new`. Statements include declarations, expression and assignment statements, blocks, conditionals, loops, functions, classes, returns, break, and continue.

`Parser.ts` is a recursive-descent parser. It consumes separators, builds statements, parses blocks, and uses precedence climbing for binary expressions. Postfix parsing handles chained calls, indexing, and member access. Parser failures are `ParserError` instances with a `SourceLocation`.

### Interpreter

`src/core/interpreter/Interpreter.ts` owns execution. It exposes:

- `start()` to begin execution.
- `step()` to execute one top-level statement boundary.
- `run()` to execute until finished or failed.
- `pause()` to request a paused status.
- `reset()` to create a fresh runtime execution state.
- `history` to expose immutable runtime snapshots captured during execution.

Each step emits a `STATEMENT` event, executes the statement, updates status, and records a snapshot. A runtime error changes the interpreter to `FAILED` and emits an `ERROR` event.

Blocks, loops, and function bodies may execute several internal AST statements during one outer step. The public step/history API is stable while finer-grained continuation stepping can be added later.

The interpreter evaluates expressions against a `Scope`. Function calls create child scopes and call frames. Class methods can receive an instance receiver, which is exposed as `this`. Return, break, and continue use internal control-flow signals rather than JavaScript exceptions exposed to the user.

Built-ins currently include `console`, `Number`, `String`, and `Array`. Array member behavior includes `length`, `push`, and `pop`.

### Runtime values

`src/core/runtime/Values.ts` defines the runtime value hierarchy:

- `PrimitiveValue`: number, string, boolean, null, or undefined.
- `ArrayValue`: mutable indexed storage with an object ID, active indices, bounds checks, and optional element type metadata.
- `ObjectValue`: string-keyed mutable properties.
- `InstanceValue`: object fields plus a class name and method table.
- `ClassValue`: a constructor-like runtime value with methods and an instance factory.
- `ArrayPointerValue`: a reference to one array element.
- `FunctionValue`: callable runtime code or a built-in function.

`displayValue()` provides readable values for the runtime inspector and visualization projection. Runtime objects remain TypeScript values inside the interpreter; the UI consumes snapshots and projections instead.

### Scopes and environments

`src/core/runtime/Scope.ts` implements lexical bindings:

- `define()` creates a binding in the current scope.
- `assign()` updates the nearest existing binding.
- `defineOrAssign()` updates an existing binding or creates a new one.
- `get()` resolves through parent scopes.
- `entries()` returns variables owned by that scope.
- Every scope has a stable environment ID and a parent reference.

The runtime registers created scopes. This lets snapshots preserve globals, function environments, and block environments after a function returns. Retained environments support execution history and future timeline visualization.

### Classes and runtime method registries

`src/core/runtime/RuntimeClass.ts` provides `RuntimeClassRegistry` and `RuntimeClassDefinition`. A runtime class definition has:

- A type name.
- A method map receiving `(receiver, argumentsList, runtime)`.
- Optional `isAssignable` logic for type compatibility.

Use the registry for built-in computational structures. Do not add parser branches for `Queue`, `LinkedList`, or `Tree`; those are runtime concepts. A future structure can register a value type, methods, assignability rules, and events while the language keeps using normal member calls.

User-written language classes are represented by `ClassValue` and `InstanceValue`. Their methods are parsed as `FunctionDeclaration` nodes and bound to `this` when accessed from an instance.

### Runtime snapshots

`src/core/runtime/Runtime.ts` is the inspection boundary. `RuntimeSnapshot` contains:

- `stepIndex` and `currentLocation`.
- `callStack` with active runtime frames.
- `frames` with serializable frame variables.
- `environments` with IDs, parent IDs, kind, active state, and variables.
- `globals` as a convenient global-binding view.
- `frameHistory` including returned frames and captured locals.
- `events` containing the execution trace at that point.
- `globalEnvironmentId` for graph roots.

Runtime snapshots copy mutable arrays and object fields, so React history can safely retain them. New mutable runtime value types must be added to `Runtime.copyValue()` to keep historical snapshots isolated.

### Events

`src/core/execution/ExecutionEvent.ts` defines the event vocabulary:

- `PROGRAM_STARTED`
- `STATEMENT`
- `READ`
- `WRITE`
- `COMPARE`
- `CALL`
- `METHOD`
- `RETURN`
- `ERROR`
- `PROGRAM_FINISHED`

Events contain an optional source location and a payload of stable data. Payloads should use names, indexes, IDs, operators, and counts instead of React or Canvas objects. Add a new event when an operation must be visible in an execution timeline or visual animation.

`ExecutionTrace` records events and returns copies of the event list. It can be cleared during reset.

## Visualization pipeline

`src/core/visualization/VisualizationState.ts` contains the renderer-facing model.

`VisualizationProjector.project(snapshot)` converts runtime snapshots into:

- `VisualEnvironment` cards with variables and active state.
- `VisualArray` objects with values and active indices.
- `VisualInstance` objects with class names and fields.
- `VisualObject` objects with generic properties.
- `VisualStack` as a reserved discriminated type for future stack projection.

The projector deduplicates referenced objects and recursively discovers nested arrays, instances, and objects. This keeps the renderer independent of `Runtime`, `Scope`, and AST classes.

`CanvasRenderer.ts` draws the projected state. It currently:

- Draws the environment graph as variable cards.
- Draws arrays and reserved stack objects.
- Draws generic object and class-instance field panels.
- Supports custom class renderers through `registerClassRenderer()`.
- Maintains a viewport offset with `panBy()` and `resetView()`.
- Draws the world inside a translated canvas context, allowing layouts larger than the visible canvas.

`VisualizationStage.tsx` connects pointer dragging and wheel movement to `CanvasRenderer.panBy()`. Its Fit button calls `resetView()`. The renderer does not decide algorithm intent; it only draws the projection it receives.

## Adding a new data structure

For a built-in computational structure:

1. Add a runtime value class in `Values.ts` or a focused runtime file.
2. Add it to the `RuntimeValue` union.
3. Add copy logic in `Runtime.copyValue()`.
4. Register assignability and methods in `RuntimeClassRegistry`.
5. Add interpreter construction or builtin installation if the language needs a constructor.
6. Emit structure-specific events such as `ENQUEUE`, `DEQUEUE`, `LINK`, or `ROTATE` if the UI needs them.
7. Project the value into a discriminated visualization object.
8. Register a specialized renderer with `CanvasRenderer.registerClassRenderer()` when generic fields are not enough.

For a user-written class, no runtime registry change is required for basic construction. The parser creates a `ClassDeclaration`, the interpreter creates a `ClassValue`, `new` creates an `InstanceValue`, and member access binds methods to the instance.

Example renderer extension:

```ts
renderer.registerClassRenderer("Queue", (context, object, x, y, width, height) => {
  // Draw queue-specific geometry using object.fields.
});
```

Keep custom renderers focused on drawing. Queue or linked-list mutation belongs in the runtime/interpreter layer.

## Adding a language feature

1. Add a token or keyword in `Token.ts` and `Lexer.ts`.
2. Add an AST node in `Ast.ts` with a source location.
3. Teach `Parser.ts` how to construct the node and report `ParserError` locations.
4. Add evaluation in `Interpreter.ts` and create or update scopes as needed.
5. Emit events for observable operations.
6. Ensure `Runtime.snapshot()` copies any new mutable value type.
7. Extend `VisualizationState` only if the feature needs a visual projection.
8. Add a runtime smoke test and run `npm run build`.

Do not solve language behavior in the renderer or UI. Keep the dependency direction flowing from UI to core, not from core to React or Canvas.

## Validation

The application build is:

```powershell
npm run build
```

A useful manual smoke program should include declarations, arrays, object fields, a user-defined class, method calls, and a mutation. Run it in the editor, inspect the runtime-state panel, use Previous/Next step, and drag or wheel the visualization when the projected world is larger than the canvas.
