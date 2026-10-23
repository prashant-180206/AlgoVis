# AlgoVis Architecture

AlgoVis is a small interpreted algorithm language with a separate runtime and visualization pipeline. It does not execute JavaScript, Python, or Rust. The syntax is JavaScript-like, but all execution is implemented by the TypeScript core.

```text
source
  -> Lexer
  -> tokens
  -> Parser
  -> AST
  -> Interpreter
  -> Runtime + ExecutionTrace + RuntimeSnapshots + step timeline
  -> VisualizationProjector
  -> VisualizationState
  -> PixiRenderer
```

## Boundaries

- `src/core/language` owns source locations, tokens, lexical analysis, parsing, and AST nodes.
- `src/core/interpreter` evaluates AST nodes, creates scopes, invokes functions and methods, and controls execution status.
- `src/core/runtime` owns values, scopes, classes, call frames, event history, snapshots, and retained environments.
- `src/core/execution` defines observable execution events and the event trace.
- `src/core/modules` stores fetched module source text and resolves module URLs. It never evaluates host JavaScript.
- `src/core/visualization` converts runtime snapshots into renderer-safe state, builds nested environment trees, and draws that state with PixiJS.
- `src/App.tsx` coordinates editing, execution history, step playback, snapshot selection, and the PixiJS stage. React does not evaluate AST nodes or mutate runtime values directly.
- `src-tauri` provides the desktop shell. It is not part of the language runtime.

The core is exported through `src/core/index.ts`, so application code can import the public language, runtime, interpreter, and visualization APIs from one module.

## Current language

The language uses JavaScript-like delimiters and control-flow syntax:

```js
import { Stack } from "./modules/structures.js";

let stack = new Stack();
stack.push(10);
let top = stack.pop();
```

Module files use the same language and are parsed and executed by the AlgoVis interpreter. The host only fetches their text. Top-level declarations are implicitly exported; `export` is accepted as an optional marker.

The current syntax includes:

- Literals: numbers, strings, booleans, `null`, and `undefined`.
- Identifiers, `this`, arrays, and object literals.
- `let`, `const`, and `var` declarations.
- Assignments and compound assignments: `=`, `+=`, `-=`, `*=`, `/=`.
- Arithmetic, comparison, equality, logical, unary, increment, and decrement operators.
- Calls, member access, and index access.
- Functions, returns, blocks, `if`/`else`, `while`, `for`, `break`, and `continue`.
- Classes, constructors, methods, instances, `new`, and instance fields.
- Top-level `import` declarations (side-effect, named, aliased, and namespace) and optional `export` markers on top-level declarations.
- Semicolons as explicit statement separators and execution boundaries for top-level stepping.

This is an intentionally small language, not a complete ECMAScript implementation. Unsupported JavaScript features should be added through the language pipeline rather than evaluated with `eval`.

## Core modules

### Language

`src/core/language/SourceLocation.ts` defines `SourcePosition` and `SourceLocation`. Every token and AST node carries a source range so parser, interpreter, and UI errors can point back to the editor.

`Token.ts` defines `TokenType` and immutable `Token` values. The token set includes keywords, literals, operators, delimiters, braces, brackets, dots, commas, colons, newlines, semicolons, and EOF.

`Lexer.ts` converts source text into tokens. It handles whitespace, line comments, block comments, numbers, quoted strings with basic escapes, identifiers, keyword lookup, and longest-match operator recognition. Keyword lookup must use own-property checks so identifiers such as `constructor` and `toString` cannot accidentally resolve through `Object.prototype`.

`Ast.ts` contains the syntax tree. Expressions include literals, identifiers, `this`, arrays, objects, unary/binary operators, calls, indexes, members, and `new`. Statements include declarations, imports, expression and assignment statements, blocks, conditionals, loops, functions, classes, returns, break, and continue. `ImportDeclaration` records the module path plus named or namespace bindings.

`Parser.ts` is a recursive-descent parser. It consumes separators, builds statements, parses blocks, and uses precedence climbing for binary expressions. Postfix parsing handles chained calls, indexing, and member access. Parser failures are `ParserError` instances with a `SourceLocation`.

### Modules

`src/core/modules/ModuleRegistry.ts` is a synchronous, source-only registry. The host fetches module text and registers it by normalized absolute URL. The interpreter receives the registry and resolves each `import` relative to the importing module (or the configured base URL for the entry program).

Supported import forms are:

```js
import "./modules/setup.js";
import { Stack, Queue as Fifo } from "./modules/structures.js";
import * as structures from "./modules/structures.js";
```

The sample module surface is `public/modules/structures.js`. AlgoVis does not use host `import()`, `eval`, or a browser JavaScript engine for module source. This keeps module execution inside the inspectable interpreter and prevents arbitrary host execution.

### Interpreter

`src/core/interpreter/Interpreter.ts` owns execution. It exposes:

- `start()` to begin execution.
- `step()` to execute one top-level statement boundary.
- `run()` to execute until finished or failed.
- `pause()` to request a paused status.
- `reset()` to create a fresh runtime execution state.
- `history` to expose immutable runtime snapshots captured during execution.
- `steps` to expose the statement-level playback timeline.

Each step emits a `STATEMENT` event, executes the statement, updates status, and records a snapshot. A runtime error changes the interpreter to `FAILED` and emits an `ERROR` event.

`execute()` records a step before every executable statement, including statements nested in blocks, loops, and function bodies. It does not record synthetic block delimiters. Loop conditions add one step per iteration, and the interpreter records a final step after completion or failure. The coarse outer `step()` API still advances top-level statement boundaries; the timeline is the finer-grained history used by the UI.

The interpreter evaluates expressions against a `Scope`. Function calls create child scopes and call frames. Class methods can receive an instance receiver, which is exposed as `this`. Return, break, and continue use internal control-flow signals rather than JavaScript exceptions exposed to the user.

Import declarations resolve against a `ModuleRegistry`, parse the stored source on demand, and evaluate it once in a cached module scope. Module initialization suppresses `Runtime.recordStep()` and execution events so module setup does not pollute the main program trace. Imported bindings are copied into the importing scope. Module scopes are registered as `module` environments and remain available as inactive context ancestors.

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
- `defineBuiltin()` defines a host-provided binding such as `console`; built-ins are hidden from visualization and collapsed in the inspector.
- `assign()` updates the nearest existing binding.
- `defineOrAssign()` updates an existing binding or creates a new one.
- `get()` resolves through parent scopes.
- `hasOwn()` and `getOwn()` inspect bindings declared directly in a scope, which is useful for module export lookup.
- `entries()` returns variables owned by that scope.
- Every scope has a stable environment ID and a parent reference.

The runtime registers created scopes. This lets snapshots preserve globals, module environments, function environments, and block environments after a function returns. Block scopes are marked active only while they are executing and contain bindings, so the active-environment view shows the current loop/block variables without retaining empty block cards. Module scopes are tagged with kind `module`; they are inactive context unless a function defined in that module is on the call stack. Inactive scopes remain available in the inspector's all-environments view and in returned-frame history.

Environment relationships are represented as a forest, not flat cards. `EnvironmentTree.ts` walks parent IDs and attaches each included environment to its nearest included ancestor, so a block is rendered inside its function, which is inside its module, which is inside the global scope. The Pixi stage and runtime inspector share this helper.

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
- `environments` with IDs, parent IDs, kind (`global`, `module`, `function`, or `block`), active state, and variables.
- `globals` as a convenient global-binding view.
- `frameHistory` including returned frames and captured locals.
- `events` containing the execution trace at that point.
- `globalEnvironmentId` for graph roots.

Runtime snapshots copy mutable arrays and object fields, so React history can safely retain them. New mutable runtime value types must be added to `Runtime.copyValue()` to keep historical snapshots isolated.

### Step timeline

`Runtime` records two histories:

- `snapshots` — every observable event, used for the execution trace and console output.
- `steps` — one snapshot per executed statement, used by the step debugger and timeline.

`Runtime.recordStep(location)` captures the environment *before* a statement executes and stores the statement's source location. The interpreter calls it for every executable statement, including statements nested inside blocks, loop bodies, and function bodies. Loop conditions record an additional step per iteration, so a `for` loop produces one timeline entry per pass rather than one entry for the whole loop.

The interpreter also records an initial `READY` step at the first program statement and a final step after `PROGRAM_FINISHED` or `ERROR`. `Interpreter.steps` exposes the timeline; the first step is displayed before execution and the final step contains the completed program state. Steps and events are suppressed while a module is initializing, so imported class definitions do not create phantom line numbers in the main source trace.

`App.tsx` treats the timeline as playback data. Play, pause, previous line, next line, and the timeline slider only move a cursor over already-recorded snapshots; they never re-execute or mutate runtime state. `stepForward()` runs the program on first use if the trace has not been built yet, then advances one statement at a time. The current snapshot's `currentLocation` drives the Monaco line decoration.

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

- `VisualEnvironment` entries with variables, active state, kind, and parent IDs.
- `VisualArray` objects with values and active indices.
- `VisualInstance` objects with class names and fields.
- `VisualObject` objects with generic properties.

The projector uses an identity-based `WeakSet<RuntimeObject>` to deduplicate referenced objects, and recursively discovers nested arrays, instances, and objects without special-casing class names. This keeps the renderer independent of `Runtime`, `Scope`, and AST classes. `displayValue()` is recursion-stack safe, so self-referential lists and objects render a cycle marker rather than overflowing. Built-in host bindings are marked with `builtin: true` so the stage and inspector can hide `console`, `Number`, `String`, and `Array` without hiding user variables.

`PixiRenderer.ts` owns a PixiJS `Application` and renders the projected state as a scene graph:

- The environment forest renders as nested panels: child scopes are drawn inside their nearest included parent, with a guide line and indentation. Inactive ancestors are dimmed but still provide context.
- Arrays render as indexed tiles with active indices highlighted.
- Instances and objects render as field panels, including imported linked lists and trees.
- The world container can be panned by dragging or with the wheel.
- `resetView()` restores the viewport, and the stage's Fullscreen button expands the canvas host.

`VisualizationStage.tsx` creates the renderer asynchronously with `app.init()`, feeds it new `VisualizationState` objects after each step, and destroys the Pixi application on unmount. The renderer rebuilds its display list from the projection for each step, so it never reads scopes, call frames, or mutable runtime values.

`CanvasRenderer.ts` remains available as a flat Canvas 2D fallback and as a reference for custom class renderers. `PixiRenderer.registerClassRenderer(className, callback)` is the PixiJS extension point; the callback receives a `PixiRenderContext` with the scene container and a text helper. `VisualizationStage` accepts `configureRenderer` so the registration happens before the renderer's first frame.

The renderer does not decide algorithm intent; it only draws the projection it receives.

## Adding a new data structure

For a built-in computational structure:

1. Add a runtime value class in `Values.ts` or a focused runtime file.
2. Add it to the `RuntimeValue` union.
3. Add copy logic in `Runtime.copyValue()`.
4. Register assignability and methods in `RuntimeClassRegistry`.
5. Add interpreter construction or builtin installation if the language needs a constructor.
6. Emit structure-specific events such as `ENQUEUE`, `DEQUEUE`, `LINK`, or `ROTATE` if the UI needs them.
7. Project the value into a discriminated visualization object.
8. Register a specialized renderer with `PixiRenderer.registerClassRenderer()` when generic fields are not enough.

For a user-written class, no runtime registry change is required for basic construction. The parser creates a `ClassDeclaration`, the interpreter creates a `ClassValue`, `new` creates an `InstanceValue`, and member access binds methods to the instance. The same class can live in `public/modules/*.js` and be imported with a normal `import` declaration. The projector deliberately does not special-case names such as `Stack`; generic instance fields and recursively projected child objects cover linked lists, trees, and queues until a custom renderer is registered.

Example PixiJS renderer extension:

```ts
renderer.registerClassRenderer("Queue", (context, object, x, y, width, height) => {
  context.addText(object.label.toUpperCase(), x, y, { color: 0xd8f27a, bold: true });
  // Add Graphics or Text nodes to context.container.
});
```

The Canvas 2D fallback exposes the same idea with `CanvasRenderer.registerClassRenderer()`. Keep custom renderers focused on drawing. Queue or linked-list mutation belongs in the runtime/interpreter layer.

## Adding a language feature

1. Add a token or keyword in `Token.ts` and `Lexer.ts`.
2. Add an AST node in `Ast.ts` with a source location.
3. Teach `Parser.ts` how to construct the node and report `ParserError` locations.
4. Add evaluation in `Interpreter.ts` and create or update scopes as needed.
5. Emit events for observable operations.
6. Ensure `Runtime.snapshot()` copies any new mutable value type.
7. Extend `VisualizationState` only if the feature needs a visual projection.
8. Add a runtime smoke test and run `pnpm build`.

Do not solve language behavior in the renderer or UI. Keep the dependency direction flowing from UI to core, not from core to React or a specific rendering surface.

## Validation

The application build is:

```powershell
pnpm build
```

A useful manual smoke program should include an import from `./modules/structures.js`, declarations, arrays, loops, object fields, a user-defined class, method calls, and a mutation. Run it in the editor, use Play or Next/Previous to advance one statement at a time, scrub the timeline, inspect the nested runtime environments and execution-trace panels, and drag or wheel the PixiJS visualization when the projected world is larger than the canvas. Confirm that module scopes appear as dim context ancestors when a method from the module is active.
