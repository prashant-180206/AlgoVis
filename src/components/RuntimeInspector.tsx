import { useState } from "react";
import { Box, Braces, ChevronDown, ChevronRight, Layers3, Terminal } from "lucide-react";
import {
  buildEnvironmentForest,
  displayValue,
  type EnvironmentSnapshot,
  type EnvironmentTreeNode,
  type RuntimeSnapshot,
  type VariableSnapshot,
} from "../core";
import { Card, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";

interface RuntimeInspectorProps {
  snapshot?: RuntimeSnapshot;
  previousSnapshot?: RuntimeSnapshot;
}

function signature(variable: VariableSnapshot): string {
  return `${displayValue(variable.value)}::${variable.objectId ?? ""}`;
}

function variableSignatures(
  snapshot: RuntimeSnapshot | undefined,
  environmentId: string,
): Map<string, string> | undefined {
  const environment = snapshot?.environments.find(
    (candidate) => candidate.id === environmentId,
  );
  if (!environment) return undefined;
  return new Map(
    environment.variables.map((variable) => [
      variable.name,
      signature(variable),
    ]),
  );
}

function environmentBadgeClass(kind: EnvironmentSnapshot["kind"]): string {
  if (kind === "module") return "border-amber-300/20 text-amber-300";
  if (kind === "function") return "border-sky-300/20 text-sky-300";
  if (kind === "block") return "border-violet-300/20 text-violet-300";
  return "border-lime-300/20 text-lime-300";
}

function environmentLabel(kind: EnvironmentSnapshot["kind"]): string {
  if (kind === "global") return "Global environment";
  if (kind === "module") return "Module environment";
  if (kind === "function") return "Function environment";
  return "Block environment";
}

interface EnvironmentTreeViewProps {
  nodes: readonly EnvironmentTreeNode<EnvironmentSnapshot>[];
  previousSnapshot?: RuntimeSnapshot;
  showBuiltins: boolean;
}

function EnvironmentTreeView({
  nodes,
  previousSnapshot,
  showBuiltins,
}: EnvironmentTreeViewProps) {
  return (
    <>
      {nodes.map((node) => {
        const environment = node.environment;
        const previousSignatures = variableSignatures(
          previousSnapshot,
          environment.id,
        );
        const visibleVariables = environment.variables.filter(
          (variable) => showBuiltins || !variable.builtin,
        );
        const hiddenBuiltins =
          environment.variables.length - visibleVariables.length;

        return (
          <section
            className={`rounded-md border ${
              environment.active
                ? "border-white/8 bg-[#121612]"
                : "border-white/5 bg-[#101410]"
            }`}
            key={environment.id}
          >
            <div
              className={`flex items-center gap-2 border-b border-white/[0.07] px-3 py-2 ${
                environment.active ? "" : "opacity-50"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  environment.active ? "bg-lime-300" : "bg-zinc-700"
                }`}
              />
              <Badge className={environmentBadgeClass(environment.kind)}>
                {environment.kind}
              </Badge>
              <strong className="text-xs font-medium text-zinc-300">
                {environmentLabel(environment.kind)}
              </strong>
              <code className="ml-auto font-mono text-[10px] text-zinc-700">
                {environment.id}
              </code>
            </div>
            <div
              className={`flex items-center gap-3 border-b border-white/5 px-3 py-1 text-[9px] uppercase tracking-wider text-zinc-700 ${
                environment.active ? "" : "opacity-50"
              }`}
            >
              <span>
                {environment.parentId
                  ? `nested in ${environment.parentId}`
                  : "root scope"}
              </span>
              <span>{visibleVariables.length} bindings</span>
              {hiddenBuiltins > 0 ? (
                <span>{hiddenBuiltins} built-in</span>
              ) : null}
            </div>
            {visibleVariables.length === 0 ? (
              <div className="px-3 py-3 text-xs text-zinc-700">
                No captured bindings
              </div>
            ) : (
              <div>
                {visibleVariables.map((variable) => {
                  const previous = previousSignatures?.get(variable.name);
                  const changed =
                    previousSignatures !== undefined &&
                    previous !== signature(variable);
                  return (
                    <div
                      className={`grid grid-cols-[minmax(60px,.7fr)_minmax(90px,1fr)_minmax(60px,.7fr)] gap-2 border-b border-white/5 px-3 py-2 last:border-0 ${
                        changed ? "bg-amber-300/5" : ""
                      } ${environment.active ? "" : "opacity-50"}`}
                      key={`${environment.id}-${variable.name}`}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        {changed ? (
                          <i className="h-1 w-1 shrink-0 rounded-full bg-amber-300" />
                        ) : null}
                        <span className="truncate font-mono text-xs text-zinc-300">
                          {variable.name}
                        </span>
                        {variable.builtin ? (
                          <span className="shrink-0 text-[8px] uppercase text-zinc-700">
                            host
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`truncate font-mono text-xs ${
                          changed ? "text-amber-200" : "text-lime-200/80"
                        }`}
                        title={displayValue(variable.value)}
                      >
                        {displayValue(variable.value)}
                      </span>
                      <span className="truncate text-right font-mono text-[10px] text-zinc-600">
                        {variable.className ??
                          variable.declaredType ??
                          variable.runtimeType}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {node.children.length > 0 ? (
              <div className="ml-3 space-y-2 border-l border-white/10 py-2 pl-3">
                <EnvironmentTreeView
                  nodes={node.children}
                  previousSnapshot={previousSnapshot}
                  showBuiltins={showBuiltins}
                />
              </div>
            ) : null}
          </section>
        );
      })}
    </>
  );
}

export function RuntimeInspector({
  snapshot,
  previousSnapshot,
}: RuntimeInspectorProps) {
  const [showAllEnvironments, setShowAllEnvironments] = useState(false);
  const [showBuiltins, setShowBuiltins] = useState(false);
  const [expandedReturnedFrame, setExpandedReturnedFrame] = useState<
    string | undefined
  >(undefined);
  const allEnvironments = snapshot?.environments ?? [];
  const environmentForest = buildEnvironmentForest(allEnvironments, {
    shouldInclude: (environment) =>
      showAllEnvironments
        ? environment.kind === "global" ||
          environment.active ||
          environment.variables.some((variable) => !variable.builtin)
        : environment.active,
    includeAncestors: (environment) =>
      environment.kind === "global" ||
      environment.variables.some((variable) => !variable.builtin),
    rootId: snapshot?.globalEnvironmentId,
  });
  const frames = snapshot?.frames ?? [];
  const returnedFrames = snapshot?.frameHistory?.filter(
    (frame) => frame.status === "returned",
  ) ?? [];

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,.7fr)]">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Braces className="h-4 w-4 text-lime-300" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
              Runtime state
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="text-[10px] uppercase tracking-wider text-zinc-600 transition-colors hover:text-lime-300"
              onClick={() => setShowBuiltins((value) => !value)}
              type="button"
            >
              {showBuiltins ? "Hide built-ins" : "Show built-ins"}
            </button>
            <button
              className="text-[10px] uppercase tracking-wider text-zinc-600 transition-colors hover:text-lime-300"
              onClick={() => setShowAllEnvironments((value) => !value)}
              type="button"
            >
              {showAllEnvironments ? "Active only" : "All environments"}
            </button>
          </div>
        </CardHeader>
        <div className="flex items-start justify-between gap-5 border-b border-white/8 px-5 py-4">
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-lime-300/80">
              Live environment graph
            </p>
            <h2 className="text-lg font-medium tracking-tight text-white">
              Bindings &amp; objects
            </h2>
            <p className="mt-1 max-w-lg text-xs leading-5 text-zinc-600">
              Variables changed during this step are highlighted in amber.
            </p>
          </div>
          <div className="hidden shrink-0 gap-5 sm:flex">
            {[
              [snapshot?.events.length ?? 0, "events"],
              [snapshot?.frames.length ?? 0, "frames"],
              [snapshot?.stepIndex ?? 0, "event step"],
            ].map(([value, label]) => (
              <div key={label} className="text-right">
                <strong className="block font-mono text-lg font-normal text-zinc-200">
                  {value}
                </strong>
                <span className="text-[10px] uppercase tracking-wider text-zinc-600">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="max-h-90 space-y-2 overflow-auto p-3">
          <EnvironmentTreeView
            nodes={environmentForest}
            previousSnapshot={previousSnapshot}
            showBuiltins={showBuiltins}
          />
          {environmentForest.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Layers3 className="mb-2 h-5 w-5 text-zinc-700" />
              <span className="text-xs text-zinc-600">
                Run or step the program to inspect runtime state.
              </span>
            </div>
          ) : null}
        </div>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-lime-300" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
              Call stack
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">
            {frames.length} frames · {returnedFrames.length} returned
          </span>
        </CardHeader>
        <div className="max-h-90 space-y-2 overflow-auto p-3">
          {frames
            .slice()
            .reverse()
            .map((frame, index) => (
              <section
                className={`rounded-md border p-3 ${
                  index === 0
                    ? "border-lime-300/30 bg-lime-300/4"
                    : "border-white/8 bg-[#121612]"
                }`}
                key={frame.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-lime-300/70">
                    {index === 0 ? "Current" : `Call ${index}`}
                  </span>
                  <code className="font-mono text-[10px] text-zinc-700">
                    {frame.callLocation
                      ? `line ${frame.callLocation.start.line}`
                      : frame.environmentId}
                  </code>
                </div>
                <strong className="mt-1 block font-mono text-sm text-zinc-200">
                  {frame.functionName}()
                </strong>
                {frame.variables.length === 0 ? (
                  <p className="mt-2 border-t border-white/6 pt-2 text-[11px] text-zinc-700">
                    No local bindings
                  </p>
                ) : (
                  frame.variables.map((variable) => (
                    <div
                      className="mt-2 flex justify-between gap-3 border-t border-white/6 pt-2 text-xs"
                      key={`${frame.id}-${variable.name}`}
                    >
                      <span className="font-mono text-zinc-500">
                        {variable.name}
                      </span>
                      <b
                        className="truncate font-mono font-normal text-lime-200/70"
                        title={displayValue(variable.value)}
                      >
                        {displayValue(variable.value)}
                      </b>
                    </div>
                  ))
                )}
              </section>
            ))}
          {frames.length === 0 && returnedFrames.length === 0 ? (
            <div className="py-12 text-center">
              <Box className="mx-auto mb-2 h-5 w-5 text-zinc-700" />
              <p className="text-xs text-zinc-600">No active function frames</p>
            </div>
          ) : null}
          {returnedFrames.length > 0 ? (
            <div className="pt-2">
              <p className="mb-2 px-1 text-[9px] uppercase tracking-[0.16em] text-zinc-700">
                Returned frames
              </p>
              {returnedFrames.map((frame) => {
                const expanded = expandedReturnedFrame === frame.id;
                return (
                  <section
                    className="mb-2 rounded-md border border-white/5 bg-[#111511]"
                    key={frame.id}
                  >
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left"
                      onClick={() =>
                        setExpandedReturnedFrame(expanded ? undefined : frame.id)
                      }
                      type="button"
                    >
                      {expanded ? (
                        <ChevronDown className="h-3 w-3 text-zinc-600" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-zinc-600" />
                      )}
                      <span className="font-mono text-xs text-zinc-400">
                        {frame.functionName}()
                      </span>
                      <span className="ml-auto text-[9px] uppercase tracking-wider text-zinc-700">
                        returned
                      </span>
                    </button>
                    {expanded ? (
                      <div className="border-t border-white/5 px-3 py-2">
                        {frame.variables?.length ? (
                          frame.variables.map((variable) => (
                            <div
                              className="flex justify-between gap-3 py-1 text-[11px]"
                              key={`${frame.id}-${variable.name}`}
                            >
                              <span className="font-mono text-zinc-600">
                                {variable.name}
                              </span>
                              <span
                                className="truncate font-mono text-zinc-400"
                                title={displayValue(variable.value)}
                              >
                                {displayValue(variable.value)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-zinc-700">
                            Captured locals are unavailable.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
