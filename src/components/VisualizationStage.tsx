import { useEffect, useRef, useState } from "react";
import { Activity, Maximize2, ScanLine } from "lucide-react";
import {
  defaultClassRenderers,
  PixiRenderer,
  type VisualizationState,
} from "../core";
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
    // Data-structure classes are visualized purely by their class name, so
    // scripts need no builtins or registration of their own.
    Object.entries(defaultClassRenderers).forEach(([className, renderer$]) =>
      renderer.registerClassRenderer(className, renderer$),
    );
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

  function toggleFullscreen(): void {
    const host = hostRef.current;
    if (!host) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void host.requestFullscreen();
  }

  return (
    <Card className="flex h-full min-h-0 flex-col">
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
      >
        {!ready ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            starting pixi renderer
          </div>
        ) : null}
      
      </div>
      <div className="flex shrink-0 items-center justify-between border-t border-white/8 px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
        <span>Environment projection</span>
        <span className="font-mono text-zinc-500">
          STEP {stepCount === 0 ? 0 : stepIndex} /{" "}
          {Math.max(0, stepCount - 1)}
          {visualization.activeOperation
            ? ` · ${visualization.activeOperation}`
            : ""}
        </span>
      </div>
    </Card>
  );
}
