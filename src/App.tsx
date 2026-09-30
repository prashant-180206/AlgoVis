import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, ChevronLeft, ChevronRight, CirclePlay, Gauge, RotateCcw, Settings2, Sparkles, Square } from "lucide-react";
import {
  CanvasRenderer,
  Interpreter,
  Lexer,
  Parser,
  RuntimeSnapshot,
  TokenType,
  VisualizationProjector,
} from "./core";
import { CodeEditor } from "./components/CodeEditor";
import { RuntimeInspector } from "./components/RuntimeInspector";
import { VisualizationStage } from "./components/VisualizationStage";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Card } from "./components/ui/card";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot>();
  const [history, setHistory] = useState<readonly RuntimeSnapshot[]>([]);
  const [historyCursor, setHistoryCursor] = useState(0);
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
  const selectedEvent = snapshot?.events[snapshot.events.length - 1];
  const selectedLocation = snapshot?.currentLocation
    ? `line ${snapshot.currentLocation.start.line}, column ${Math.max(1, snapshot.currentLocation.start.column)}`
    : "before execution";

  useEffect(() => {
    const initial = parsed.interpreter?.runtime.snapshot();
    setSnapshot(initial);
    setHistory(initial ? [initial] : []);
    setHistoryCursor(0);
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

  function run(): void {
    if (!parsed.interpreter) return;
    const next = parsed.interpreter.run();
    setSnapshot(next);
    setHistory(parsed.interpreter.history);
    setHistoryCursor(parsed.interpreter.history.length - 1);
  }

  function reset(): void {
    if (!parsed.interpreter) return;
    parsed.interpreter.reset();
    const initial = parsed.interpreter.runtime.snapshot();
    setSnapshot(initial);
    setHistory([initial]);
    setHistoryCursor(0);
  }

  function moveAcrossSteps(delta: number): void {
    if (history.length === 0) return;
    const nextCursor = Math.max(0, Math.min(history.length - 1, historyCursor + delta));
    setHistoryCursor(nextCursor);
    setSnapshot(history[nextCursor]);
  }

  return (
    <main className="min-h-screen bg-[#0d100e] text-zinc-100 selection:bg-lime-300/30">
      <header className="mx-auto flex max-w-370 items-center justify-between px-5 py-5 lg:px-8"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-md bg-lime-300 text-xs font-black text-[#10140f] shadow-[0_0_24px_rgba(216,242,122,.18)]">AV</div><div><div className="flex items-center gap-2"><strong className="text-sm font-semibold tracking-tight">AlgoVis</strong><Badge className="border-lime-300/20 text-lime-300">LAB 01</Badge></div><span className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Algorithm language laboratory</span></div></div><div className="hidden items-center gap-5 text-[10px] uppercase tracking-[0.14em] text-zinc-600 sm:flex"><span className="flex items-center gap-2"><i className="h-1.5 w-1.5 rounded-full bg-lime-300 shadow-[0_0_10px_#d8f27a]" /> Core online</span><span>Lexer ready</span><Button variant="ghost" size="icon" aria-label="Settings" title="Settings"><Settings2 className="h-4 w-4" /></Button></div></header>
      <div className="mx-auto max-w-370 px-5 pb-10 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-y border-white/8 py-3"><div className="flex items-center gap-1.5"><Button variant="default" onClick={run} disabled={!parsed.interpreter}><CirclePlay className="h-4 w-4" />Run</Button><Button variant="secondary" size="icon" onClick={() => moveAcrossSteps(-1)} disabled={historyCursor <= 0} aria-label="Previous step" title="Previous step"><ChevronLeft className="h-4 w-4" /></Button><Button variant="secondary" size="icon" onClick={() => moveAcrossSteps(1)} disabled={historyCursor >= history.length - 1} aria-label="Next step" title="Next step"><ChevronRight className="h-4 w-4" /></Button><Button variant="secondary" disabled><Square className="h-3 w-3" />Pause</Button><Button variant="ghost" onClick={reset} disabled={!parsed.interpreter}><RotateCcw className="h-3.5 w-3.5" />Reset</Button></div><div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.12em] text-zinc-600"><span className="hidden items-center gap-1.5 sm:flex"><Gauge className="h-3.5 w-3.5" /> Speed</span><input className="w-20 accent-lime-300" type="range" min="1" max="5" defaultValue="3" aria-label="Execution speed" /><span className="font-mono text-zinc-400">STEP {history.length === 0 ? 0 : historyCursor} / {Math.max(0, history.length - 1)}</span></div></div>
        <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(400px,.9fr)_minmax(0,1.35fr)] lg:min-h-140"><CodeEditor source={source} error={parsed.error} onChange={setSource} /><VisualizationStage canvasRef={canvasRef} visualization={visualization} /></div>
        <div className="mb-4 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.13em] text-zinc-600"><span className="flex items-center gap-1.5"><Boxes className="h-3.5 w-3.5 text-lime-300" /> Lexer preview</span><span>{tokens.length} tokens including EOF</span><span className="ml-auto hidden sm:inline">{selectedEvent?.type ?? "READY"} · {selectedLocation}</span></div>
        <Card className="mb-4"><div className="flex gap-2 overflow-x-auto p-3">{meaningfulTokens.slice(0, 18).map((token, index) => <span className="shrink-0 rounded border border-white/8 bg-white/2.5 px-2 py-1 font-mono text-[10px] text-zinc-400" key={`${token.lexeme}-${index}`}><b className="mr-1.5 font-normal text-lime-300/60">{token.type}</b>{token.lexeme || "EOF"}</span>)}</div></Card>
        <RuntimeInspector snapshot={snapshot} />
        <footer className="mt-7 flex items-center justify-between border-t border-white/8 pt-4 text-[10px] uppercase tracking-[0.12em] text-zinc-700"><span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> Built for understanding execution</span><span>AlgoVis v0.1</span></footer>
      </div>
    </main>
  );
}

export default App;
