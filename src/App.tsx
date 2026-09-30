import { useEffect, useMemo, useRef, useState } from "react";
import {
  CanvasRenderer,
  Interpreter,
  Lexer,
  Parser,
  RuntimeSnapshot,
  TokenType,
  VisualizationProjector,
} from "./core";
import "./App.css";

const starterSource = `class Stack {
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
console.log(count);`;
const renderer = new CanvasRenderer();
const projector = new VisualizationProjector();

function App() {
  const [source, setSource] = useState(starterSource);
  const [activeTab, setActiveTab] = useState("Variables");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot>();
  const parsed = useMemo(() => {
    try {
      const tokens = new Lexer(source).tokenize();
      return {
        tokens,
        interpreter: new Interpreter(new Parser(tokens).parse()),
        error: undefined,
      };
    } catch (error) {
      return {
        tokens: [],
        interpreter: undefined,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [source]);
  const tokens = parsed.tokens;
  const meaningfulTokens = tokens.filter(
    (token) => token.type !== TokenType.Newline,
  );
  const visualization = useMemo(
    () =>
      snapshot ? projector.project(snapshot) : { objects: [], stepIndex: 0 },
    [snapshot],
  );

  useEffect(() => {
    setSnapshot(parsed.interpreter?.runtime.snapshot());
  }, [parsed.interpreter]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderer.render(
      canvas.getContext("2d")!,
      visualization,
      canvas.width,
      canvas.height,
    );
  }, [visualization]);

  function step(): void {
    if (!parsed.interpreter) return;
    setSnapshot(parsed.interpreter.step());
  }

  function run(): void {
    if (!parsed.interpreter) return;
    setSnapshot(parsed.interpreter.run());
  }

  function reset(): void {
    if (!parsed.interpreter) return;
    parsed.interpreter.reset();
    setSnapshot(parsed.interpreter.runtime.snapshot());
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">AV</span>
          <div>
            <strong>AlgoVis</strong>
            <span>language laboratory</span>
          </div>
        </div>
        <div className="status">
          <span className="status-dot" /> Core online{" "}
          <span className="divider" /> Lexer ready
        </div>
      </header>
      <section className="toolbar">
        <div className="toolbar-group">
          <button
            className="primary"
            type="button"
            onClick={run}
            disabled={!parsed.interpreter}
          >
            Run
          </button>
          <button type="button" onClick={step} disabled={!parsed.interpreter}>
            Step
          </button>
          <button type="button" disabled>
            Pause
          </button>
          <button type="button" onClick={reset} disabled={!parsed.interpreter}>
            Reset
          </button>
        </div>
        <div className="toolbar-group toolbar-meta">
          <span>Execution mode</span>
          <b>Meaningful state</b>
          <span>Speed</span>
          <input
            type="range"
            min="1"
            max="5"
            defaultValue="3"
            aria-label="Execution speed"
          />
        </div>
      </section>
      <section className="workspace">
        <article className="panel editor-panel">
          <div className="panel-heading">
            <span>01 / SOURCE</span>
            <span className="chip">JS-LIKE LANGUAGE</span>
          </div>
          <textarea
            value={source}
            onChange={(event) => setSource(event.target.value)}
            spellCheck={false}
            aria-label="Algorithm source"
          />
          {parsed.error && <div className="parse-error">{parsed.error}</div>}
          <div className="editor-footer">
            <span>Lexer input</span>
            <span>{source.split("\n").length} lines</span>
          </div>
        </article>
        <article className="panel visualization-panel">
          <div className="panel-heading">
            <span>02 / VISUALIZATION</span>
            <span className="muted">
              Canvas 2D / {visualization.objects.length} object
              {visualization.objects.length === 1 ? "" : "s"}
            </span>
          </div>
          <canvas
            className="visualization-canvas"
            ref={canvasRef}
            width={900}
            height={320}
            aria-label="Algorithm visualization canvas"
          />
        </article>
      </section>
      <section className="inspector panel">
        <div className="tabs">
          {["Variables", "Call Stack", "Operations", "Timeline"].map((tab) => (
            <button
              className={activeTab === tab ? "tab active" : "tab"}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="inspector-content">
          <div>
            <span className="eyebrow">{activeTab.toUpperCase()}</span>
            <h2>
              {activeTab === "Variables"
                ? "Runtime scope"
                : `${activeTab} is ready for the next milestone`}
            </h2>
            <p>
              {activeTab === "Variables"
                ? "The interpreter owns values, scopes, frames, and source locations. The Canvas only observes projected visualization state."
                : "This panel is intentionally wired to the execution boundary, so new runtime behavior can arrive without changing the renderer."}
            </p>
          </div>
          <div className="metrics">
            <div>
              <strong>{meaningfulTokens.length}</strong>
              <span>tokens</span>
            </div>
            <div>
              <strong>{snapshot?.events.length ?? 0}</strong>
              <span>events</span>
            </div>
            <div>
              <strong>{snapshot?.callStack.length ?? 0}</strong>
              <span>frames</span>
            </div>
          </div>
        </div>
      </section>
      <section className="token-strip">
        <div className="panel-heading">
          <span>LEXER PREVIEW</span>
          <span className="muted">{tokens.length} tokens including EOF</span>
        </div>
        <div className="tokens">
          {meaningfulTokens.slice(0, 18).map((token, index) => (
            <span className="token" key={`${token.lexeme}-${index}`}>
              <b>{token.type}</b>
              {token.lexeme || "EOF"}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
