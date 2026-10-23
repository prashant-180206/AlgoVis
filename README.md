# AlgoVis

AlgoVis is an interactive algorithm language laboratory. It lets users write a small JavaScript-like algorithm language, execute it through a custom TypeScript interpreter, inspect runtime environments and call frames step by step, and visualize data structures on a PixiJS surface.

The project is a React + Vite application with an optional Tauri desktop shell.

## What It Does

AlgoVis is built around one observable execution pipeline:

```text
Editor source
  -> Lexer
  -> Parser
  -> AST
  -> Interpreter
  -> Runtime snapshots, step timeline, and execution events
  -> Visualization projector
  -> PixiJS renderer and runtime inspector
```

The interpreter is not the browser's JavaScript engine. The editor uses JavaScript syntax highlighting, but source code is tokenized, parsed, and executed by `src/core`.

## Current UI

The main screen is an execution workspace with six connected areas.

### 1. Project header

The header identifies the AlgoVis laboratory, reports core/lexer status, and provides the settings entry point reserved for future configuration.

### 2. Algorithm editor

`src/components/CodeEditor.tsx` wraps Monaco Editor.

It provides:

- JavaScript-like syntax highlighting.
- Monaco diagnostics and IntelliSense configuration.
- An AlgoVis dark theme.
- Line numbers, smooth scrolling, two-space tabs, and no minimap.
- A current-line decoration and gutter marker that follow the selected execution step.
- A compact source excerpt for the statement being executed.
- Parser/lexer and runtime errors displayed below the editor.
- Source line count and the `Algorithm.js` identity used by the UI.

The editor value is React state owned by `App.tsx`. Every source change creates a new lexer, parser, and interpreter instance.

### 3. Execution toolbar

The toolbar is implemented in `App.tsx` and provides:

- `Play` / `Pause`: animate through the recorded statement timeline at the selected speed.
- Previous / Next: move backward or forward one statement. Keyboard arrows do the same when focus is outside the editor.
- `Run to end`: execute the program and jump to the final step. Running again after completion restarts from the beginning.
- `Reset`: clear the interpreter and restore the initial `READY` snapshot.
- Speed slider: controls the playback interval from 900 ms to 150 ms per step.
- Timeline slider: scrub every recorded statement step, including nested loop and function statements.
- Status readout: current line, latest event type, and step position.

The step controls operate on `Interpreter.steps`, a pre-recorded timeline of `RuntimeSnapshot`s. Browsing the timeline does not mutate the interpreter state.

### 4. Live visualization

`src/components/VisualizationStage.tsx` hosts the PixiJS renderer.

It displays:

- Active environment cards and their user variable bindings.
- Arrays with indexed tiles and active-index highlighting.
- User classes named `Stack` (with an `items` array) as top-first stacks.
- Generic objects and class instances as field panels.
- A step number and active operation footer.

The canvas supports:

- Pointer dragging to pan.
- Wheel movement to pan.
- Fit visualization to reset the viewport.
- Fullscreen mode for the visualization surface.

`src/core/visualization/PixiRenderer.ts` builds the PixiJS scene graph from the projected state. It does not read scopes or runtime values directly. `CanvasRenderer.ts` is retained as a Canvas 2D fallback.

### 5. Runtime inspector

`src/components/RuntimeInspector.tsx` displays the runtime snapshot independently from the PixiJS stage.

It shows:

- Active environments and their variables, with an option to reveal retained scopes.
- Runtime types, formatted values, and object/class metadata.
- Variables changed by the previous step highlighted in amber.
- Host built-ins such as `console`, `Number`, `String`, and `Array`, hidden by default.
- Active call frames, locals, call-line information, and collapsible returned frames.
- Event count and current event step.

This panel is intended for precise inspection. The PixiJS stage is intended for spatial and structural understanding.

### 6. Execution feed

`src/components/ExecutionFeed.tsx` shows two synchronized views of the selected snapshot:

- Console output collected from `WRITE` events, with the source line for each entry.
- The most recent execution events (`STATEMENT`, `READ`, `COMPARE`, `CALL`, `RETURN`, `ERROR`, and `PROGRAM_FINISHED`).

Both views are cumulative up to the selected step, so scrubbing the timeline also rewinds console output and the event trace.

## Running the project

### Requirements

- Node.js compatible with the current Vite/TypeScript toolchain.
- pnpm for browser development, builds, and Tauri workflows.
- Rust and Tauri prerequisites for desktop development.

### Install dependencies

```powershell
pnpm install
```

The repository contains `pnpm-lock.yaml`. Keep it updated when dependency changes are made.

### Start the browser app

```powershell
pnpm dev
```

Vite serves the app at `http://localhost:1420`.

The port is intentionally strict because Tauri expects the fixed development URL. If port 1420 is already occupied, stop the existing Vite process before starting another one.

### Build the application

```powershell
pnpm build
```

This runs TypeScript checking first and then creates the Vite production bundle in `dist/`.

### Preview the production bundle

```powershell
pnpm preview
```

### Run Tauri

```powershell
pnpm tauri dev
```

The Tauri configuration starts the frontend using `pnpm dev`, loads `http://localhost:1420`, and packages the Vite `dist/` directory. Use the browser workflow when only frontend behavior is being developed; use Tauri when validating the desktop shell.

## Project structure

```text
AlgoVis/
├── docs/
│   ├── architecture.md       Core architecture and extension guide
│   └── ...
├── public/                   Static public assets
├── src/
│   ├── App.tsx               UI composition and execution coordination
│   ├── App.css               Application-level styling
│   ├── components/
│   │   ├── CodeEditor.tsx    Monaco editor surface
│   │   ├── ExecutionFeed.tsx Console output and event trace
│   │   ├── RuntimeInspector.tsx
│   │   ├── VisualizationStage.tsx
│   │   └── ui/               Reusable button, card, badge, separator UI
│   └── core/
│       ├── execution/        Events and execution trace
│       ├── interpreter/       AST evaluation and stepping
│       ├── language/          Lexer, parser, tokens, AST, locations
│       ├── runtime/           Values, scopes, classes, snapshots
│       └── visualization/     Snapshot projection and PixiJS drawing
├── src-tauri/                Rust/Tauri desktop shell
├── index.html                Vite HTML entry point
├── package.json              Scripts and dependencies
├── tsconfig.json             TypeScript application config
├── vite.config.ts            Vite, React, Tailwind, and Tauri dev config
└── README.md                 This project guide
```

See [docs/architecture.md](docs/architecture.md) for the detailed core reference.

## Application logic

### Source parsing

`App.tsx` owns the editable source. The `useMemo` parsing boundary performs:

1. `new Lexer(source).tokenize()`.
2. `new Parser(tokens).parse()`.
3. `new Interpreter(program)`.

Any lexer or parser error is stored as a UI error and prevents execution controls from running an invalid program.

### Execution, steps, and history

The interpreter owns a `Runtime`. It emits execution events, updates scopes and values, and records two synchronized histories:

- `Runtime.snapshots`: a fine-grained snapshot for every observable event (`READ`, `WRITE`, `COMPARE`, `CALL`, and so on).
- `Runtime.steps`: a statement-level playback timeline. One snapshot is captured before each statement executes, including statements nested in blocks, loops, and function bodies. Loop conditions add one entry per iteration, and the runtime records a final entry after completion or failure.

`Interpreter.steps` exposes the timeline. `App.tsx` stores the current snapshot and a cursor into it; play, pause, previous/next, and the timeline slider only move that cursor. The first `Next` action builds the full trace if needed and then advances one statement at a time. The selected snapshot's `currentLocation` drives the Monaco line highlight, while its events drive the console and execution-trace panels.

A snapshot contains:

- Global variables.
- All retained environments and parent links.
- Active call frames.
- Returned frame history.
- Event trace.
- Current source location.
- Step index.

### Visualization data flow

`VisualizationProjector` converts a `RuntimeSnapshot` into serializable `VisualizationState`:

```text
RuntimeSnapshot
  -> VisualEnvironment[]
  -> VisualArray[] / VisualStack[] / VisualInstance[] / VisualObject[]
  -> PixiRenderer
```

The renderer receives no AST nodes, scopes, React state, or mutable runtime objects. This separation allows future Queue, LinkedList, Tree, or graph renderers to be added without changing the interpreter. Host bindings such as `console` are flagged as built-ins and filtered from the visualization.

### Adding class-specific visuals

Both renderers expose a class renderer registry:

```ts
renderer.registerClassRenderer("Queue", (context, object, x, y, width, height) => {
  // PixiRenderer: add Graphics or Text nodes to context.container.
});
```

Runtime behavior belongs in `src/core/runtime` and `src/core/interpreter`. Drawing behavior belongs in `src/core/visualization`.

## Current language example

The starter program demonstrates loops, arrays, a user-defined class, instance fields, method calls, mutation, and output:

```js
let numbers = [5, 2, 9, 1, 7, 3];
let total = 0;

for (let index = 0; index < numbers.length; index++) {
  total += numbers[index];
  console.log("running total", total);
}

class Stack {
  constructor() { this.items = []; }
  push(value) { this.items.push(value); }
  pop() { return this.items.pop(); }
}

let stack = new Stack();
stack.push(10);
stack.push(20);
let top = stack.pop();
console.log("top", top, "total", total);
```

## Development conventions

- Keep language behavior inside `src/core`; do not implement interpreter semantics in React components.
- Keep runtime state explicit and snapshot-safe.
- Add source locations to new AST nodes and parser errors.
- Add runtime copy support for every new mutable value type.
- Use stable object IDs in visualization data.
- Emit events for operations that need timeline or animation visibility.
- Record a `Runtime.recordStep()` entry for new statement types so the step debugger can pause there.
- Keep PixiJS and Canvas renderers independent from runtime classes.
- Prefer focused changes and run `pnpm build` after core or UI changes.

## Related documentation

- [Core architecture](docs/architecture.md)
- [Core module reference](src/core/README.md)
- [Tauri configuration](src-tauri/tauri.conf.json)
- [Package scripts and dependencies](package.json)
