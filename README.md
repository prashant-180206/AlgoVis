# AlgoVis

AlgoVis is an interactive algorithm language laboratory. It lets users write a small JavaScript-like algorithm language, execute it through a custom TypeScript interpreter, inspect runtime environments and call frames, and visualize data structures on a Canvas 2D surface.

The project is a React + Vite application with an optional Tauri desktop shell.

## What It Does

AlgoVis is built around one observable execution pipeline:

```text
Editor source
  -> Lexer
  -> Parser
  -> AST
  -> Interpreter
  -> Runtime snapshots and execution events
  -> Visualization projector
  -> Canvas renderer and runtime inspector
```

The interpreter is not the browser's JavaScript engine. The editor uses JavaScript syntax highlighting, but source code is tokenized, parsed, and executed by `src/core`.

## Current UI

The main screen is an execution workspace with five connected areas.

### 1. Project header

The header identifies the AlgoVis laboratory, reports core/lexer status, and provides the settings entry point reserved for future configuration.

### 2. Algorithm editor

`src/components/CodeEditor.tsx` wraps Monaco Editor.

It provides:

- JavaScript-like syntax highlighting.
- Monaco diagnostics and IntelliSense configuration.
- An AlgoVis dark theme.
- Line numbers, smooth scrolling, two-space tabs, and no minimap.
- Parser/lexer errors displayed below the editor.
- Source line count and the `Algorithm.js` identity used by the UI.

The editor value is React state owned by `App.tsx`. Every source change creates a new lexer, parser, and interpreter instance.

### 3. Execution toolbar

The toolbar is implemented in `App.tsx` and provides:

- `Run`: execute until finished or failed.
- Previous step: move backward through saved runtime snapshots.
- Next step: move forward through saved runtime snapshots.
- `Pause`: reserved for incremental asynchronous execution.
- `Reset`: clear the interpreter and restore the initial runtime state.
- Speed slider: reserved for future timed execution.
- Current history position and total snapshot count.

The step buttons operate on `Interpreter.history`, so browsing history does not mutate the current interpreter state.

### 4. Live visualization

`src/components/VisualizationStage.tsx` hosts the Canvas renderer.

It displays:

- Environment cards and variable bindings.
- Arrays and future stack projections.
- Generic objects and class instances.
- A step number and active operation footer.

The canvas supports:

- Pointer dragging to pan.
- Wheel movement to pan.
- Fit visualization to reset the viewport.
- A fullscreen button reserved for the next UI milestone.

`src/core/visualization/CanvasRenderer.ts` draws the projected state. It does not read scopes or runtime values directly.

### 5. Runtime inspector

`src/components/RuntimeInspector.tsx` displays the runtime snapshot independently from the Canvas.

It shows:

- Active environments and their variables.
- Runtime types and formatted values.
- Environment IDs.
- Active call frames and local variables.
- Event count and current step.
- Returned-frame data when history contains completed calls.

This panel is intended for precise inspection. The Canvas is intended for spatial and structural understanding.

### 6. Lexer preview

The token strip below the workspace shows the first meaningful lexer tokens, excluding newline tokens. It is a quick diagnostic for checking whether source text is being classified as expected.

## Running the project

### Requirements

- Node.js compatible with the current Vite/TypeScript toolchain.
- npm for browser development and builds.
- Rust and Tauri prerequisites for desktop development.
- pnpm is required by the Tauri configuration's `beforeDevCommand` and `beforeBuildCommand`.

### Install dependencies

Using npm:

```powershell
npm install
```

The repository also contains `pnpm-lock.yaml` for Tauri-oriented workflows. Keep lockfiles consistent with the package manager used for dependency changes.

### Start the browser app

```powershell
npm run dev
```

Vite serves the app at `http://localhost:1420`.

The port is intentionally strict because Tauri expects the fixed development URL. If port 1420 is already occupied, stop the existing Vite process before starting another one.

### Build the application

```powershell
npm run build
```

This runs TypeScript checking first and then creates the Vite production bundle in `dist/`.

### Preview the production bundle

```powershell
npm run preview
```

### Run Tauri

```powershell
npm run tauri dev
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
│   │   ├── RuntimeInspector.tsx
│   │   ├── VisualizationStage.tsx
│   │   └── ui/               Reusable button, card, badge, separator UI
│   └── core/
│       ├── execution/        Events and execution trace
│       ├── interpreter/       AST evaluation and stepping
│       ├── language/          Lexer, parser, tokens, AST, locations
│       ├── runtime/           Values, scopes, classes, snapshots
│       └── visualization/     Snapshot projection and Canvas drawing
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

### Execution and history

The interpreter owns a `Runtime`. It emits execution events, updates scopes and values, and captures a `RuntimeSnapshot` after meaningful execution events. `App.tsx` stores the current snapshot and the snapshot history cursor.

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
  -> VisualArray[] / VisualInstance[] / VisualObject[]
  -> CanvasRenderer
```

The renderer receives no AST nodes, scopes, React state, or mutable runtime objects. This separation allows future Queue, LinkedList, Tree, or graph renderers to be added without changing the interpreter.

### Adding class-specific visuals

The renderer reserves a class renderer registry:

```ts
renderer.registerClassRenderer("Queue", (context, object, x, y, width, height) => {
  // Draw Queue-specific geometry from object.fields.
});
```

Runtime behavior belongs in `src/core/runtime` and `src/core/interpreter`. Drawing behavior belongs in `src/core/visualization`.

## Current language example

The starter program demonstrates a user-defined class, instance fields, method calls, arrays, mutation, and output:

```js
class Stack {
  constructor() { this.items = []; }
  push(value) { this.items.push(value); }
  pop() { return this.items.pop(); }
  size() { return this.items.length; }
}

let stack = new Stack();
stack.push(10);
stack.push(20);
let top = stack.pop();
let count = stack.size();
console.log(top);
console.log(count);
```

## Development conventions

- Keep language behavior inside `src/core`; do not implement interpreter semantics in React components.
- Keep runtime state explicit and snapshot-safe.
- Add source locations to new AST nodes and parser errors.
- Add runtime copy support for every new mutable value type.
- Use stable object IDs in visualization data.
- Emit events for operations that need timeline or animation visibility.
- Keep Canvas renderers independent from runtime classes.
- Prefer focused changes and run `npm run build` after core or UI changes.

## Related documentation

- [Core architecture](docs/architecture.md)
- [Core module reference](src/core/README.md)
- [Tauri configuration](src-tauri/tauri.conf.json)
- [Package scripts and dependencies](package.json)
