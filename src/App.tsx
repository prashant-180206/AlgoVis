import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  CirclePlay,
  FastForward,
  Gauge,
  RotateCcw,
  Settings2,
  Sparkles,
} from "lucide-react";
import {
  ExecutionEventType,
  Interpreter,
  InterpreterStatus,
  Lexer,
  Parser,
  VisualizationProjector,
  type RuntimeSnapshot,
} from "./core";
import { CodeEditor } from "./components/CodeEditor";
import { ExecutionFeed } from "./components/ExecutionFeed";
import { RuntimeInspector } from "./components/RuntimeInspector";
import { VisualizationStage } from "./components/VisualizationStage";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import "./App.css";

const starterSource = `let numbers = [5, 2, 9, 1, 7, 3];
let total = 0;

for (let index = 0; index < numbers.length; index++) {
  total += numbers[index];
  console.log("running total", total);
}

class Stack {
  constructor() {
    this.items = [];
  }
  push(value) {
    this.items.push(value);
  }
  pop() {
    return this.items.pop();
  }
}

let stack = new Stack();
stack.push(10);
stack.push(20);
let top = stack.pop();
console.log("top", top, "total", total);`;

const projector = new VisualizationProjector();
const speedIntervals = [900, 650, 450, 280, 150];

function App() {
  const [source, setSource] = useState(starterSource);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot>();
  const [steps, setSteps] = useState<readonly RuntimeSnapshot[]>([]);
  const [stepCursor, setStepCursor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);
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

  const visualization = useMemo(
    () =>
      snapshot
        ? projector.project(snapshot)
        : { environments: [], objects: [], stepIndex: 0 },
    [snapshot],
  );
  const selectedEvent = snapshot?.events[snapshot.events.length - 1];
  const snapshotError =
    selectedEvent?.type === ExecutionEventType.Error
      ? String(selectedEvent.payload?.message ?? "Runtime error")
      : undefined;
  const error = parsed.error ?? snapshotError;
  const status = parsed.interpreter?.status ?? InterpreterStatus.Ready;
  const speedMs = speedIntervals[speed - 1] ?? 450;
  const lastStep = Math.max(0, steps.length - 1);
  const playbackStatus = parsed.error
    ? "INVALID"
    : isPlaying
      ? "RUNNING"
      : stepCursor === 0 && status === InterpreterStatus.Ready
        ? "READY"
        : stepCursor >= lastStep && steps.length > 1
          ? status === InterpreterStatus.Failed
            ? "FAILED"
            : "FINISHED"
          : "PAUSED";
  const previousSnapshot =
    stepCursor > 0 ? steps[stepCursor - 1] : undefined;

  useEffect(() => {
    const interpreter = parsed.interpreter;
    const nextSteps = interpreter ? [...interpreter.steps] : [];
    setSteps(nextSteps);
    setStepCursor(0);
    setSnapshot(nextSteps[0] ?? interpreter?.runtime.snapshot());
    setIsPlaying(false);
  }, [parsed.interpreter]);

  useEffect(() => {
    if (!isPlaying) return;
    if (steps.length === 0 || stepCursor >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      const next = Math.min(stepCursor + 1, steps.length - 1);
      setStepCursor(next);
      setSnapshot(steps[next]);
    }, speedMs);
    return () => window.clearTimeout(timer);
  }, [isPlaying, stepCursor, steps, speedMs]);

  function moveToStep(index: number): void {
    if (steps.length === 0) return;
    const next = Math.max(0, Math.min(steps.length - 1, index));
    setStepCursor(next);
    setSnapshot(steps[next]);
  }

  function ensureTrace(): readonly RuntimeSnapshot[] {
    const interpreter = parsed.interpreter;
    if (!interpreter) return [];
    if (interpreter.status === InterpreterStatus.Ready) interpreter.run();
    const nextSteps = [...interpreter.steps];
    setSteps(nextSteps);
    return nextSteps;
  }

  function runToEnd(): void {
    if (!parsed.interpreter) return;
    setIsPlaying(false);
    const complete =
      parsed.interpreter.status === InterpreterStatus.Finished ||
      parsed.interpreter.status === InterpreterStatus.Failed;
    if (complete) {
      if (steps.length > 1 && stepCursor < steps.length - 1) {
        const last = Math.max(0, steps.length - 1);
        setStepCursor(last);
        setSnapshot(steps[last]);
        return;
      }
      parsed.interpreter.reset();
    }
    parsed.interpreter.run();
    const nextSteps = [...parsed.interpreter.steps];
    setSteps(nextSteps);
    setStepCursor(Math.max(0, nextSteps.length - 1));
    setSnapshot(nextSteps[nextSteps.length - 1]);
  }

  function stepForward(): void {
    if (!parsed.interpreter) return;
    setIsPlaying(false);
    const trace = ensureTrace();
    if (trace.length === 0) return;
    const next = Math.min(trace.length - 1, stepCursor + 1);
    setStepCursor(next);
    setSnapshot(trace[next]);
  }

  function stepBackward(): void {
    setIsPlaying(false);
    moveToStep(stepCursor - 1);
  }

  function togglePlayback(): void {
    if (!parsed.interpreter) return;
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    const trace = ensureTrace();
    if (trace.length <= 1) return;
    if (stepCursor >= trace.length - 1) {
      setStepCursor(0);
      setSnapshot(trace[0]);
    }
    setIsPlaying(true);
  }

  function reset(): void {
    if (!parsed.interpreter) return;
    setIsPlaying(false);
    parsed.interpreter.reset();
    const nextSteps = [...parsed.interpreter.steps];
    setSteps(nextSteps);
    setStepCursor(0);
    setSnapshot(nextSteps[0] ?? parsed.interpreter.runtime.snapshot());
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, .monaco-editor")) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        stepForward();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        stepBackward();
      } else if (event.key === " ") {
        event.preventDefault();
        togglePlayback();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <main className="min-h-screen bg-[#0d100e] text-zinc-100 selection:bg-lime-300/30">
      <header className="mx-auto flex max-w-370 items-center justify-between px-5 py-5 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-lime-300 text-xs font-black text-[#10140f] shadow-[0_0_24px_rgba(216,242,122,.18)]">
            AV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <strong className="text-sm font-semibold tracking-tight">AlgoVis</strong>
              <Badge className="border-lime-300/20 text-lime-300">LAB 01</Badge>
            </div>
            <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              Algorithm language laboratory
            </span>
          </div>
        </div>
        <div className="hidden items-center gap-5 text-[10px] uppercase tracking-[0.14em] text-zinc-600 sm:flex">
          <span className="flex items-center gap-2">
            <i className="h-1.5 w-1.5 rounded-full bg-lime-300 shadow-[0_0_10px_#d8f27a]" />
            {playbackStatus}
          </span>
          <span>{parsed.tokens.length} tokens</span>
          <Button variant="ghost" size="icon" aria-label="Settings" title="Settings">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-370 px-5 pb-10 lg:px-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-y border-white/8 py-3">
          <div className="flex items-center gap-1.5">
            <Button variant="default" onClick={togglePlayback} disabled={!parsed.interpreter}>
              {isPlaying ? <CirclePause className="h-4 w-4" /> : <CirclePlay className="h-4 w-4" />}
              {isPlaying ? "Pause" : "Play"}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={stepBackward}
              disabled={stepCursor <= 0}
              aria-label="Previous step"
              title="Previous step (left arrow)"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={stepForward}
              disabled={
                !parsed.interpreter ||
                (status !== InterpreterStatus.Ready && stepCursor >= lastStep)
              }
              aria-label="Next step"
              title="Next line (right arrow)"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" onClick={runToEnd} disabled={!parsed.interpreter}>
              <FastForward className="h-3.5 w-3.5" />
              Run to end
            </Button>
            <Button variant="ghost" onClick={reset} disabled={!parsed.interpreter}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
            <span className="hidden items-center gap-1.5 sm:flex">
              <Gauge className="h-3.5 w-3.5" /> Speed
            </span>
            <input
              className="w-20 accent-lime-300"
              type="range"
              min="1"
              max="5"
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
              aria-label="Execution speed"
            />
            <span className="font-mono text-zinc-500">{speedMs} ms</span>
            <span className="font-mono text-zinc-400">
              STEP {steps.length === 0 ? 0 : stepCursor} / {lastStep}
            </span>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-3 rounded-md border border-white/8 bg-[#121612] px-3 py-2">
          <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            Timeline
          </span>
          <input
            className="min-w-0 flex-1 accent-lime-300"
            type="range"
            min="0"
            max={lastStep}
            value={stepCursor}
            onChange={(event) => moveToStep(Number(event.target.value))}
            disabled={steps.length <= 1}
            aria-label="Execution timeline"
          />
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            {snapshot?.currentLocation
              ? `line ${snapshot.currentLocation.start.line}`
              : "not started"}
            {" · "}
            {selectedEvent?.type ?? "READY"}
          </span>
        </div>
        <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(400px,.9fr)_minmax(0,1.35fr)] lg:min-h-140">
          <CodeEditor
            source={source}
            error={error}
            currentLocation={snapshot?.currentLocation}
            onChange={(value) => {
              setIsPlaying(false);
              setSource(value);
            }}
          />
          <VisualizationStage
            visualization={visualization}
            stepIndex={stepCursor}
            stepCount={steps.length}
          />
        </div>
        <RuntimeInspector snapshot={snapshot} previousSnapshot={previousSnapshot} />
        <div className="mt-4">
          <ExecutionFeed snapshot={snapshot} />
        </div>
        <footer className="mt-7 flex items-center justify-between border-t border-white/8 pt-4 text-[10px] uppercase tracking-[0.12em] text-zinc-700">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> Built for understanding execution
          </span>
          <span className="flex items-center gap-1.5">
            <Boxes className="h-3 w-3" /> {parsed.tokens.length} tokens · AlgoVis v0.1
          </span>
        </footer>
      </div>
    </main>
  );
}

export default App;
