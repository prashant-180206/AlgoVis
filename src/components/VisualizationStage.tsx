import { useEffect, useRef, useState } from "react";
import { Activity, Maximize2, ScanLine } from "lucide-react";
import { PixiRenderer, type VisualizationState } from "../core";
import { Card, CardHeader } from "./ui/card";
import { Button } from "./ui/button";

interface VisualizationStageProps {
  visualization: VisualizationState;
  stepIndex: number;
  stepCount: number;
  /** Extension point for registering class-specific Pixi renderers. */
  configureRenderer?: (renderer: PixiRenderer) => void;
}

export function VisualizationStage({
  visualization,
  stepIndex,
  stepCount,
  configureRenderer,
}: VisualizationStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<PixiRenderer | undefined>(undefined);
  const latestState = useRef(visualization);
  const latestConfigure = useRef(configureRenderer);
  const [ready, setReady] = useState(false);
  latestState.current = visualization;
  latestConfigure.current = configureRenderer;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const renderer = new PixiRenderer();
    rendererRef.current = renderer;
    latestConfigure.current?.(renderer);
    void renderer
      .init(host)
      .then(() => {
        if (cancelled) return;
        renderer.render(latestState.current);
        setReady(true);
      })
      .catch((error: unknown) => {
        console.error("Unable to initialize the PixiJS visualization", error);
      });
    return () => {
      cancelled = true;
      renderer.destroy();
      if (rendererRef.current === renderer) rendererRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (ready) rendererRef.current?.render(visualization);
  }, [ready, visualization]);

  const hasUserState =
    visualization.objects.length > 0 ||
    visualization.environments.some(
      (environment) =>
        environment.active &&
        environment.variables.some((variable) => !variable.builtin),
    );

  function toggleFullscreen(): void {
    const host = hostRef.current;
    if (!host) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void host.requestFullscreen();
  }

  return (
    <Card className="flex min-h-122.5 flex-col lg:min-h-0">
      <CardHeader className="shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-lime-300" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
            Live visualization
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-2 text-[10px] uppercase tracking-wider text-zinc-600">
            PixiJS · {visualization.objects.length} objects
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => rendererRef.current?.resetView()}
            aria-label="Fit visualization"
            title="Fit visualization"
          >
            <ScanLine className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            aria-label="Fullscreen visualization"
            title="Fullscreen visualization"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <div
        ref={hostRef}
        className="relative min-h-0 flex-1 cursor-grab overflow-hidden bg-[#121612] active:cursor-grabbing"
        style={{
          backgroundImage:
            "linear-gradient(rgba(216,242,122,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(216,242,122,.035) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        {!ready ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            starting pixi renderer
          </div>
        ) : null}
        {ready && !hasUserState ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-lg border border-dashed border-lime-300/30 text-lime-300">
              <Activity className="h-6 w-6" />
            </div>
            <strong className="text-sm font-medium text-zinc-300">
              Awaiting execution
            </strong>
            <span className="max-w-57.5 text-xs leading-5 text-zinc-600">
              Run the algorithm to see its data structures take shape.
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-between border-t border-white/8 px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
        <span>Environment projection</span>
        <span className="font-mono text-zinc-500">
          STEP {stepCount === 0 ? 0 : stepIndex} / {Math.max(0, stepCount - 1)}
          {visualization.activeOperation ? ` · ${visualization.activeOperation}` : ""}
        </span>
      </div>
    </Card>
  );
}
