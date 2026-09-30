import { SourceLocation } from "../language/SourceLocation";
import { ExecutionEvent, ExecutionTrace } from "../execution/ExecutionEvent";
import { Scope } from "./Scope";
import { RuntimeValue } from "./Values";
import { RuntimeClassRegistry } from "./RuntimeClass";

export class CallFrame {
  public constructor(
    public readonly functionName: string,
    public readonly locals: Scope,
    public readonly callLocation?: SourceLocation,
  ) {}
}

export class Runtime {
  public readonly globals = new Scope();
  private readonly knownScopes = new Map<string, Scope>();
  public readonly classes = new RuntimeClassRegistry();
  public readonly callStack: CallFrame[] = [];
  public readonly trace = new ExecutionTrace();
  public currentLocation?: SourceLocation;
  public stepIndex = 0;

  public constructor() {
    this.knownScopes.set(this.globals.id, this.globals);
    this.classes.registerBuiltins();
  }

  public registerScope(scope: Scope): Scope {
    this.knownScopes.set(scope.id, scope);
    return scope;
  }

  public emit(event: ExecutionEvent): void {
    this.currentLocation = event.location;
    this.trace.record(event);
    this.stepIndex += 1;
  }

  public snapshot(): RuntimeSnapshot {
    const environments = new Map<string, EnvironmentSnapshot>();
    const collect = (scope: Scope): void => {
      if (environments.has(scope.id)) return;
      if (scope.parentScope) collect(scope.parentScope);
      environments.set(scope.id, {
        id: scope.id,
        parentId: scope.parentScope?.id,
        variables: scope.entries().map(([name, value]) => ({ name, value })),
      });
    };
    this.knownScopes.forEach((scope) => collect(scope));
    this.callStack.forEach((frame) => collect(frame.locals));
    return new RuntimeSnapshot(
      this.stepIndex,
      this.currentLocation,
      [...this.callStack],
      [...environments.values()],
      this.trace.all(),
      this.globals.entries().map(([name, value]) => ({ name, value })),
    );
  }
}

export class RuntimeSnapshot {
  public constructor(
    public readonly stepIndex: number,
    public readonly currentLocation: SourceLocation | undefined,
    public readonly callStack: readonly CallFrame[],
    public readonly environments: readonly EnvironmentSnapshot[],
    public readonly events: readonly ExecutionEvent[],
    public readonly globals: readonly VariableSnapshot[],
  ) {}
}

export interface VariableSnapshot {
  readonly name: string;
  readonly value: RuntimeValue;
}
export interface EnvironmentSnapshot {
  readonly id: string;
  readonly parentId?: string;
  readonly variables: readonly VariableSnapshot[];
}
