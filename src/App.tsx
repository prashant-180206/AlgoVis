import { useEffect, useMemo, useRef, useState } from "react";
import { usePanelRef } from "react-resizable-panels";
import {
  AlertTriangle,
  Boxes,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  CirclePlay,
  FastForward,
  FileCode2,
  Files,
  FolderOpen,
  Gauge,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import {
  ExecutionEventType,
  ImportDeclaration,
  Interpreter,
  InterpreterStatus,
  Lexer,
  ModuleRegistry,
  Parser,
  Runtime,
  VisualizationProjector,
  type Program,
  type RuntimeSnapshot,
} from "./core";
import { BottomPanel } from "./components/BottomPanel";
import { CodeEditor } from "./components/CodeEditor";
import { EditorTabs } from "./components/EditorTabs";
import { FileExplorer } from "./components/FileExplorer";
import { VisualizationStage } from "./components/VisualizationStage";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./components/ui/resizable";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import {
  moduleDisplayName,
  openWorkspaceFromMachine,
  workspaceModuleId,
  workspaceModulePath,
  type WorkspaceNode,
  type WorkspaceProvider,
} from "./workspace";
import { cn } from "./lib/utils";
import "./App.css";

const VIRTUAL_FILE = "Algorithm.js";

const starterSource = `import { Stack } from "./modules/structures.js";

let numbers = [5, 2, 9, 1, 7, 3];
let total = 0;

for (let index = 0; index < numbers.length; index++) {
  total += numbers[index];
  console.log("running total", total);
}

let stack = new Stack();
stack.push(10);
stack.push(20);
let top = stack.pop();
console.log("top", top, "total", total);`;

const projector = new VisualizationProjector();
const speedIntervals = [900, 650, 450, 280, 150];

function parseProgram(source: string): Program {
  return new Parser(new Lexer(source).tokenize()).parse();
}

function importsOf(program: Program): ImportDeclaration[] {
  return program.statements.filter(
    (statement): statement is ImportDeclaration =>
      statement instanceof ImportDeclaration,
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function fileName(path: string): string {
  const segments = path.split("/");
  return segments[segments.length - 1] || path;
}

function collectFiles(node: WorkspaceNode): WorkspaceNode[] {
  if (node.kind === "file") return [node];
  return (node.children ?? []).flatMap(collectFiles);
}

function findEntryFile(tree: WorkspaceNode): WorkspaceNode | undefined {
  const files = collectFiles(tree);
  const preferredNames = ["main.js", "index.js", "algorithm.js", "app.js"];
  for (const name of preferredNames) {
    const match = files.find((file) => file.name.toLowerCase() === name);
    if (match) return match;
  }
  return (
    files.find((file) => /\.(js|mjs|cjs|ts|tsx|jsx)$/.test(file.name)) ??
    files[0]
  );
}

function App() {
  const [openFiles, setOpenFiles] = useState<ReadonlyMap<string, string>>(
    () => new Map([[VIRTUAL_FILE, starterSource]]),
  );
  const [activePath, setActivePath] = useState<string | undefined>(VIRTUAL_FILE);
  const [dirtyPaths, setDirtyPaths] = useState<ReadonlySet<string>>(new Set());
  const [workspace, setWorkspace] = useState<WorkspaceProvider>();
  const [workspaceTree, setWorkspaceTree] = useState<WorkspaceNode>();
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string>();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [visCollapsed, setVisCollapsed] = useState(false);
  const [bottomOpen, setBottomOpen] = useState(true);
  const visPanelRef = usePanelRef();
  const sidebarPanelRef = usePanelRef();

  const [snapshot, setSnapshot] = useState<RuntimeSnapshot>();
  const [steps, setSteps] = useState<readonly RuntimeSnapshot[]>([]);
  const [stepCursor, setStepCursor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [moduleSources, setModuleSources] = useState<ReadonlyMap<string, string>>(
    () => new Map(),
  );
  const [moduleError, setModuleError] = useState<string>();
  const [moduleReload, setModuleReload] = useState(0);
  const [loadingModules, setLoadingModules] = useState(false);
  const attemptedModules = useRef<Set<string>>(new Set());
  const moduleBaseUrl = useMemo(
    () => new URL(".", window.location.href).href,
    [],
  );

  const source = activePath ? (openFiles.get(activePath) ?? "") : "";
  const entryModuleId = useMemo(() => {
    if (workspace && activePath && activePath !== VIRTUAL_FILE)
      return workspaceModuleId(activePath);
    return new URL(activePath ?? VIRTUAL_FILE, moduleBaseUrl).href;
  }, [activePath, moduleBaseUrl, workspace]);
  const modules = useMemo(() => {
    const registry = new ModuleRegistry(moduleBaseUrl);
    moduleSources.forEach((moduleSource, id) =>
      registry.setResolvedSource(id, moduleSource),
    );
    return registry;
  }, [moduleBaseUrl, moduleSources]);
  const parsed = useMemo(() => {
    try {
      const tokens = new Lexer(source).tokenize();
      const program = new Parser(tokens).parse();
      return {
        tokens,
        program,
        interpreter: new Interpreter(program, new Runtime(), modules),
        error: undefined,
      };
    } catch (error) {
      return {
        tokens: [],
        program: undefined,
        interpreter: undefined,
        error: errorMessage(error),
      };
    }
  }, [source, modules]);
  const imports = useMemo(
    () => (parsed.program ? importsOf(parsed.program) : []),
    [parsed.program],
  );
  const visibleModuleError = imports.length > 0 ? moduleError : undefined;

  useEffect(() => {
    const program = parsed.program;
    if (!program) return;

    const missing = new Set<string>();
    const scan = (candidate: Program, parentId?: string): void => {
      for (const statement of importsOf(candidate)) {
        let id: string;
        try {
          id = new URL(statement.source, parentId ?? entryModuleId).href;
        } catch {
          setModuleError(`Invalid module path '${statement.source}'.`);
          continue;
        }
        if (moduleSources.has(id) || attemptedModules.current.has(id)) continue;
        missing.add(id);
      }
    };

    scan(program);
    for (const [id, moduleSource] of moduleSources) {
      try {
        scan(parseProgram(moduleSource), id);
      } catch (error) {
        setModuleError(
          `Failed to parse module '${moduleDisplayName(id)}': ${errorMessage(error)}`,
        );
      }
    }

    if (missing.size === 0) {
      setLoadingModules(false);
      return;
    }

    setLoadingModules(true);
    let cancelled = false;
    void (async () => {
      const next = new Map(moduleSources);
      for (const id of missing) {
        attemptedModules.current.add(id);
        try {
          const workspacePath = workspaceModulePath(id);
          let moduleSource: string;
          if (workspacePath !== undefined) {
            if (!workspace)
              throw new Error("No workspace folder is open for this import.");
            moduleSource = await workspace.readFile(workspacePath);
          } else {
            const response = await fetch(id);
            if (!response.ok)
              throw new Error(`HTTP ${response.status} ${response.statusText}`);
            moduleSource = await response.text();
          }
          parseProgram(moduleSource);
          next.set(id, moduleSource);
        } catch (error) {
          if (!cancelled)
            setModuleError(
              `Failed to load module '${moduleDisplayName(id)}': ${errorMessage(error)}`,
            );
        }
      }
      if (!cancelled && next.size !== moduleSources.size)
        setModuleSources(next);
      if (!cancelled) setLoadingModules(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [parsed.program, moduleSources, entryModuleId, workspace, moduleReload]);

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
  const error = parsed.error ?? visibleModuleError ?? snapshotError;
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
  const openPaths = [...openFiles.keys()];
  const canSave =
    workspace !== undefined &&
    activePath !== undefined &&
    activePath !== VIRTUAL_FILE &&
    dirtyPaths.has(activePath);

  useEffect(() => {
    const panel = visPanelRef.current;
    if (!panel) return;
    if (visCollapsed) panel.collapse();
    else panel.expand();
  }, [visCollapsed, visPanelRef]);

  useEffect(() => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;
    if (sidebarOpen) panel.expand();
    else panel.collapse();
  }, [sidebarOpen, sidebarPanelRef]);

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

  function reloadModules(): void {
    attemptedModules.current = new Set();
    setModuleError(undefined);
    setLoadingModules(false);
    setModuleSources(new Map());
    setModuleReload((value) => value + 1);
  }

  function clearModuleCache(): void {
    attemptedModules.current = new Set();
    setModuleSources(new Map());
    setModuleError(undefined);
    setModuleReload((value) => value + 1);
  }

  async function openFolder(): Promise<void> {
    setWorkspaceLoading(true);
    setWorkspaceError(undefined);
    try {
      const provider = await openWorkspaceFromMachine();
      if (!provider) return;
      const tree = await provider.readTree();
      setWorkspace(provider);
      setWorkspaceTree(tree);
      setOpenFiles(new Map());
      setDirtyPaths(new Set());
      setActivePath(undefined);
      setIsPlaying(false);
      setSteps([]);
      setStepCursor(0);
      setSnapshot(undefined);
      clearModuleCache();

      const entry = findEntryFile(tree);
      if (entry) {
        const contents = await provider.readFile(entry.path);
        setOpenFiles(new Map([[entry.path, contents]]));
        setActivePath(entry.path);
      }
    } catch (error) {
      if (!isAbortError(error))
        setWorkspaceError(`Unable to open folder: ${errorMessage(error)}`);
    } finally {
      setWorkspaceLoading(false);
    }
  }

  async function refreshWorkspace(): Promise<void> {
    if (!workspace) return;
    setWorkspaceLoading(true);
    try {
      setWorkspaceTree(await workspace.readTree());
      setWorkspaceError(undefined);
      clearModuleCache();
    } catch (error) {
      setWorkspaceError(`Unable to refresh files: ${errorMessage(error)}`);
    } finally {
      setWorkspaceLoading(false);
    }
  }

  async function openWorkspaceFile(path: string): Promise<void> {
    if (!workspace) return;
    if (openFiles.has(path)) {
      setActivePath(path);
      return;
    }
    try {
      const contents = await workspace.readFile(path);
      setOpenFiles((current) => new Map(current).set(path, contents));
      setActivePath(path);
      setWorkspaceError(undefined);
    } catch (error) {
      setWorkspaceError(`Unable to open '${path}': ${errorMessage(error)}`);
    }
  }

  async function createWorkspaceFile(path: string): Promise<void> {
    if (!workspace) return;
    try {
      await workspace.createFile(path);
      setWorkspaceTree(await workspace.readTree());
      await openWorkspaceFile(path);
      setWorkspaceError(undefined);
    } catch (error) {
      setWorkspaceError(`Unable to create '${path}': ${errorMessage(error)}`);
    }
  }

  async function saveActiveFile(): Promise<void> {
    if (!workspace || !activePath || activePath === VIRTUAL_FILE) return;
    const contents = openFiles.get(activePath);
    if (contents === undefined) return;
    try {
      await workspace.writeFile(activePath, contents);
      setDirtyPaths((current) => {
        const next = new Set(current);
        next.delete(activePath);
        return next;
      });
      const moduleId = workspaceModuleId(activePath);
      attemptedModules.current.delete(moduleId);
      setModuleSources((current) => {
        if (!current.has(moduleId)) return current;
        const next = new Map(current);
        next.delete(moduleId);
        return next;
      });
      setModuleReload((value) => value + 1);
      setWorkspaceError(undefined);
    } catch (error) {
      setWorkspaceError(`Unable to save '${activePath}': ${errorMessage(error)}`);
    }
  }

  function updateSource(value: string): void {
    if (!activePath) return;
    setIsPlaying(false);
    setModuleError(undefined);
    setOpenFiles((current) => new Map(current).set(activePath, value));
    if (workspace && activePath !== VIRTUAL_FILE)
      setDirtyPaths((current) => new Set(current).add(activePath));
  }

  function closeFile(path: string): void {
    if (
      dirtyPaths.has(path) &&
      !window.confirm(`Discard unsaved changes in ${fileName(path)}?`)
    )
      return;
    const remaining = [...openFiles.keys()].filter((key) => key !== path);
    setOpenFiles((current) => {
      const next = new Map(current);
      next.delete(path);
      return next;
    });
    setDirtyPaths((current) => {
      const next = new Set(current);
      next.delete(path);
      return next;
    });
    if (activePath === path) setActivePath(remaining[remaining.length - 1]);
  }

  function restoreStarter(): void {
    setOpenFiles((current) =>
      new Map(current).set(VIRTUAL_FILE, starterSource),
    );
    setActivePath(VIRTUAL_FILE);
    setDirtyPaths(new Set());
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveActiveFile();
        return;
      }
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

  const activeFileName = activePath ? fileName(activePath) : undefined;

  const editorPane = (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-white/8 px-2 py-1.5">
        <Button
          variant="default"
          size="sm"
          onClick={togglePlayback}
          disabled={!parsed.interpreter || loadingModules}
        >
          {isPlaying ? (
            <CirclePause className="h-3.5 w-3.5" />
          ) : (
            <CirclePlay className="h-3.5 w-3.5" />
          )}
          {isPlaying ? "Pause" : "Play"}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8"
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
          className="h-8 w-8"
          onClick={stepForward}
          disabled={
            !parsed.interpreter ||
            loadingModules ||
            (status !== InterpreterStatus.Ready && stepCursor >= lastStep)
          }
          aria-label="Next step"
          title="Next line (right arrow)"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={runToEnd}
          disabled={!parsed.interpreter || loadingModules}
        >
          <FastForward className="h-3.5 w-3.5" />
          Run to end
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          disabled={!parsed.interpreter}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>

        <div className="flex min-w-52 flex-1 items-center gap-2 border-l border-white/8 pl-3">
          <span className="shrink-0 text-[9px] uppercase tracking-[0.12em] text-zinc-600">
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
          <span className="shrink-0 font-mono text-[9px] text-zinc-600">
            {snapshot?.currentLocation
              ? `L${snapshot.currentLocation.start.line}`
              : "—"}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-[9px] uppercase tracking-[0.12em] text-zinc-600">
          <Gauge className="hidden h-3.5 w-3.5 sm:block" />
          <input
            className="w-16 accent-lime-300"
            type="range"
            min="1"
            max="5"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            aria-label="Execution speed"
          />
          <span className="font-mono text-zinc-500">{speedMs} ms</span>
          <span className="font-mono text-zinc-500">
            {steps.length === 0 ? 0 : stepCursor} / {lastStep}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {activePath ? (
          <CodeEditor
            source={source}
            fileName={activeFileName}
            filePath={
              workspace && activePath !== VIRTUAL_FILE ? activePath : undefined
            }
            error={error}
            currentLocation={snapshot?.currentLocation}
            onChange={updateSource}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#111411] px-6 text-center">
            <FileCode2 className="h-8 w-8 text-zinc-700" />
            <div>
              <p className="text-sm font-medium text-zinc-300">No file open</p>
              <p className="mt-1 text-xs leading-5 text-zinc-600">
                Choose a file in the explorer or open a folder to start editing.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => void openFolder()}>
                <FolderOpen className="h-3.5 w-3.5" />
                Open folder
              </Button>
              {!workspace ? (
                <Button variant="ghost" size="sm" onClick={restoreStarter}>
                  Restore starter file
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-[#0d100e] text-zinc-100 selection:bg-lime-300/30">
      <header className="flex h-11 shrink-0 items-center gap-3 border-b border-white/8 bg-[#0e110e] px-3">
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="grid h-7 w-7 place-items-center rounded bg-lime-300 text-[10px] font-black text-[#10140f] shadow-[0_0_20px_rgba(216,242,122,.15)]">
            AV
          </div>
          <div className="flex items-baseline gap-2">
            <strong className="text-xs font-semibold tracking-tight">AlgoVis</strong>
            <Badge className="hidden border-lime-300/20 text-lime-300 sm:inline-flex">
              IDE
            </Badge>
          </div>
        </div>

        <div className="hidden min-w-0 items-center gap-2 border-l border-white/8 pl-3 md:flex">
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
          <span
            className="truncate font-mono text-[10px] text-zinc-500"
            title={workspace?.root}
          >
            {workspace?.root ?? "No folder opened"}
          </span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <span className="hidden items-center gap-2 px-2 text-[9px] uppercase tracking-[0.14em] text-zinc-600 sm:flex">
            <i
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                parsed.error
                  ? "bg-red-300"
                  : isPlaying
                    ? "bg-lime-300 shadow-[0_0_8px_#d8f27a]"
                    : "bg-zinc-600",
              )}
            />
            {playbackStatus}
          </span>
          {imports.length > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={reloadModules}
              disabled={loadingModules}
              aria-label="Reload imported modules"
              title="Reload imported modules"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loadingModules ? "animate-spin" : ""}`}
              />
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={() => void openFolder()}
            disabled={workspaceLoading}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Open folder
          </Button>
          <Button
            size="sm"
            onClick={() => void saveActiveFile()}
            disabled={!canSave}
            title="Save file (Ctrl+S)"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="flex w-10 shrink-0 flex-col items-center gap-1 border-r border-white/8 bg-[#0c0f0c] py-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              sidebarOpen && "bg-lime-300/10 text-lime-300",
            )}
            onClick={() => setSidebarOpen((value) => !value)}
            aria-label="Toggle file explorer"
            title="File explorer"
          >
            <Files className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => void openFolder()}
            aria-label="Open folder"
            title="Open folder"
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              !visCollapsed && "bg-lime-300/10 text-lime-300",
            )}
            onClick={() => setVisCollapsed((value) => !value)}
            aria-label="Toggle visualization"
            title={visCollapsed ? "Show visualization" : "Hide visualization"}
          >
            <Boxes className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              bottomOpen && "bg-lime-300/10 text-lime-300",
            )}
            onClick={() => setBottomOpen((value) => !value)}
            aria-label="Toggle bottom panel"
            title="Runtime, output, and problems"
          >
            <Terminal className="h-4 w-4" />
          </Button>
        </nav>

        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
          <ResizablePanel
            panelRef={sidebarPanelRef}
            defaultSize="20%"
            minSize="180px"
            maxSize="520px"
            collapsible
            collapsedSize="0px"
          >
            <FileExplorer
              tree={workspaceTree}
              workspaceName={workspace?.name}
              activePath={activePath}
              dirtyPaths={dirtyPaths}
              loading={workspaceLoading}
              onOpenFile={(path) => void openWorkspaceFile(path)}
              onRefresh={() => void refreshWorkspace()}
              onCreateFile={createWorkspaceFile}
              onOpenFolder={() => void openFolder()}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="80%" minSize="30%">
            <section className="flex h-full min-h-0 min-w-0 flex-col">
          <EditorTabs
            paths={openPaths}
            activePath={activePath}
            dirtyPaths={dirtyPaths}
            canSave={canSave}
            onSelect={(path) => {
              setIsPlaying(false);
              setActivePath(path);
            }}
            onClose={closeFile}
            onSave={() => void saveActiveFile()}
          />

          {workspaceError ? (
            <div className="flex shrink-0 items-center gap-2 border-b border-red-400/20 bg-red-400/[0.05] px-3 py-1.5 text-[11px] text-red-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate" title={workspaceError}>
                {workspaceError}
              </span>
              <button
                className="rounded p-0.5 text-red-300/60 hover:bg-white/10 hover:text-red-200"
                onClick={() => setWorkspaceError(undefined)}
                type="button"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}

          <ResizablePanelGroup orientation="vertical" className="min-h-0 flex-1">
            <ResizablePanel defaultSize="70%" minSize="30%">
              <ResizablePanelGroup orientation="horizontal" className="h-full">
                <ResizablePanel defaultSize="60%" minSize="25%">
                  {editorPane}
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel
                  panelRef={visPanelRef}
                  defaultSize="40%"
                  minSize="15%"
                  maxSize="75%"
                  collapsible
                  collapsedSize="0%"
                >
                  <VisualizationStage
                    visualization={visualization}
                    stepIndex={stepCursor}
                    stepCount={steps.length}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            {bottomOpen ? (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize="30%" minSize="12%" maxSize="60%">
                  <BottomPanel
                    snapshot={snapshot}
                    previousSnapshot={previousSnapshot}
                    error={error}
                    status={playbackStatus}
                    stepIndex={stepCursor}
                    stepCount={steps.length}
                  />
                </ResizablePanel>
              </>
            ) : null}
            </ResizablePanelGroup>
            </section>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-white/8 bg-[#0c0f0c] px-3 text-[9px] uppercase tracking-[0.12em] text-zinc-600">
        <span className="flex items-center gap-1.5 text-lime-300/70">
          <Sparkles className="h-3 w-3" />
          {playbackStatus}
        </span>
        <span className="hidden items-center gap-1.5 sm:flex">
          <FileCode2 className="h-3 w-3" />
          {activePath ?? "no file"}
        </span>
        <span className="ml-auto flex items-center gap-3">
          <span>{parsed.tokens.length} tokens</span>
          {imports.length > 0 ? (
            <span>
              {loadingModules
                ? "loading modules"
                : `${moduleSources.size} module${moduleSources.size === 1 ? "" : "s"}`}
            </span>
          ) : null}
          <span>
            {steps.length === 0 ? 0 : stepCursor} / {lastStep} steps
          </span>
          <span className="hidden items-center gap-1.5 md:flex">
            <Boxes className="h-3 w-3" />
            {workspace?.kind ?? "preview"} · AlgoVis v0.1
          </span>
        </span>
      </footer>
    </main>
  );
}

export default App;
