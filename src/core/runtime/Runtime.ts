import { SourceLocation } from "../language/SourceLocation";
import { ExecutionEvent, ExecutionTrace } from "../execution/ExecutionEvent";
import { Scope } from "./Scope";
import {
  ArrayValue,
  ArrayPointerValue,
  ClassValue,
  InstanceValue,
  ObjectValue,
  FunctionValue,
  PrimitiveValue,
  RuntimeObject,
  RuntimeValue,
} from "./Values";
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
  public readonly frameHistory: FrameHistoryEntry[] = [];
  public readonly snapshots: RuntimeSnapshot[] = [];
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

  public enterFrame(frame: CallFrame): void {
    this.callStack.push(frame);
    this.frameHistory.push({
      id: `frame-${this.frameHistory.length + 1}-${frame.locals.id}`,
      functionName: frame.functionName,
      environmentId: frame.locals.id,
      status: "active",
    });
  }

  public leaveFrame(): void {
    const frame = this.callStack.pop();
    if (!frame) return;
    for (let index = this.frameHistory.length - 1; index >= 0; index -= 1) {
      const history = this.frameHistory[index];
      if (
        history.environmentId === frame.locals.id &&
        history.status === "active"
      ) {
        history.status = "returned";
        break;
      }
    }
  }

  public resetExecution(): void {
    this.callStack.length = 0;
    this.frameHistory.length = 0;
    this.snapshots.length = 0;
    this.trace.clear();
    this.globals.clear();
    this.knownScopes.clear();
    this.knownScopes.set(this.globals.id, this.globals);
    this.currentLocation = undefined;
    this.stepIndex = 0;
  }

  public emit(event: ExecutionEvent): void {
    this.currentLocation = event.location;
    this.trace.record(event);
    this.stepIndex += 1;
    this.snapshots.push(this.snapshot());
  }

  public captureSnapshot(): RuntimeSnapshot {
    const snapshot = this.snapshot();
    this.snapshots.push(snapshot);
    return snapshot;
  }

  public snapshot(): RuntimeSnapshot {
    const environments = new Map<string, EnvironmentSnapshot>();
    const valueCopies = new Map<RuntimeObject, RuntimeValue>();
    const frameScopeIds = new Set(
      this.callStack.map((frame) => frame.locals.id),
    );
    const collect = (scope: Scope): void => {
      if (environments.has(scope.id)) return;
      if (scope.parentScope) collect(scope.parentScope);
      environments.set(scope.id, {
        id: scope.id,
        parentId: scope.parentScope?.id,
        active: scope.id === this.globals.id || frameScopeIds.has(scope.id),
        kind:
          scope.id === this.globals.id
            ? "global"
            : frameScopeIds.has(scope.id)
              ? "function"
              : "block",
        variables: scope
          .entries()
          .map(([name, value]) => this.describeVariable(scope, name, value, valueCopies)),
      });
    };
    this.knownScopes.forEach((scope) => collect(scope));
    this.callStack.forEach((frame) => collect(frame.locals));
    const frames = this.callStack.map((frame, index) => ({
      id: `frame-${index}-${frame.locals.id}`,
      functionName: frame.functionName,
      environmentId: frame.locals.id,
      callLocation: frame.callLocation,
      variables: frame.locals
        .entries()
        .map(([name, value]) =>
            this.describeVariable(frame.locals, name, value, valueCopies),
        ),
    }));
    return new RuntimeSnapshot(
      this.stepIndex,
      this.currentLocation,
      [...this.callStack],
      [...environments.values()],
      this.trace.all(),
      this.globals
        .entries()
        .map(([name, value]) =>
            this.describeVariable(this.globals, name, value, valueCopies),
        ),
      this.globals.id,
      frames,
      this.frameHistory.map((entry) => ({
        ...entry,
        variables: environments.get(entry.environmentId)?.variables ?? [],
      })),
    );
  }

  private describeVariable(
    scope: Scope,
    name: string,
    value: RuntimeValue,
    valueCopies: Map<RuntimeObject, RuntimeValue>,
  ): VariableSnapshot {
    const object = value instanceof RuntimeObject;
    return {
      name,
      value: this.copyValue(value, valueCopies),
      environmentId: scope.id,
      declaredType: scope.declaredType(name)?.toString(),
      runtimeType: value.runtimeType,
      objectId: this.objectId(value),
      className: value instanceof InstanceValue ? value.className : undefined,
      isObject: object && !(value instanceof PrimitiveValue),
    };
  }

  private copyValue(value: RuntimeValue, copies: Map<RuntimeObject, RuntimeValue>): RuntimeValue {
    if (!(value instanceof RuntimeObject)) return value;
    const existing = copies.get(value);
    if (existing) return existing;
    if (value instanceof ArrayValue) {
      const copy = new ArrayValue(value.id, [], new Set(value.activeIndices), value.elementType);
      copies.set(value, copy);
      value.values.forEach((item) => copy.values.push(this.copyValue(item, copies)));
      return copy;
    }
    if (value instanceof ArrayPointerValue) {
      const copy = new ArrayPointerValue(this.copyValue(value.array, copies) as ArrayValue, value.index);
      copies.set(value, copy);
      return copy;
    }
    if (value instanceof InstanceValue) {
      const copy = new InstanceValue(value.className, value.methods, new Map());
      copies.set(value, copy);
      value.properties.forEach((item, key) => copy.properties.set(key, this.copyValue(item, copies)));
      return copy;
    }
    if (value instanceof ObjectValue) {
      const copy = new ObjectValue(new Map());
      copies.set(value, copy);
      value.properties.forEach((item, key) => copy.properties.set(key, this.copyValue(item, copies)));
      return copy;
    }
    if (value instanceof ClassValue || value instanceof FunctionValue) return value;
    return value;
  }

  private objectId(value: RuntimeValue): string | undefined {
    if (value instanceof ArrayValue) return value.id;
    if (value instanceof ArrayPointerValue) return value.array.id;
    return undefined;
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
    public readonly globalEnvironmentId: string,
    public readonly frames: readonly CallFrameSnapshot[],
    public readonly frameHistory: readonly FrameHistoryEntry[],
  ) {}
}

export interface VariableSnapshot {
  readonly name: string;
  readonly value: RuntimeValue;
  readonly environmentId?: string;
  readonly declaredType?: string;
  readonly runtimeType?: string;
  readonly objectId?: string;
  readonly className?: string;
  readonly isObject?: boolean;
}
export interface EnvironmentSnapshot {
  readonly id: string;
  readonly parentId?: string;
  readonly kind: "global" | "function" | "block";
  readonly active: boolean;
  readonly variables: readonly VariableSnapshot[];
}
export interface CallFrameSnapshot {
  readonly id: string;
  readonly functionName: string;
  readonly environmentId: string;
  readonly callLocation?: SourceLocation;
  readonly variables: readonly VariableSnapshot[];
}

export interface FrameHistoryEntry {
  readonly id: string;
  readonly functionName: string;
  readonly environmentId: string;
  status: "active" | "returned";
  variables?: readonly VariableSnapshot[];
}
