import { SourceLocation } from "../language/SourceLocation";
import { ExecutionEvent, ExecutionTrace } from "../execution/ExecutionEvent";
import { Scope } from "./Scope";
import { RuntimeValue } from "./Values";

export class CallFrame {
  public constructor(
    public readonly functionName: string,
    public readonly locals: Scope,
    public readonly callLocation?: SourceLocation,
  ) {}
}

export class Runtime {
  public readonly globals = new Scope();
  public readonly callStack: CallFrame[] = [];
  public readonly trace = new ExecutionTrace();
  public currentLocation?: SourceLocation;
  public stepIndex = 0;

  public emit(event: ExecutionEvent): void {
    this.currentLocation = event.location;
    this.trace.record(event);
    this.stepIndex += 1;
  }

  public snapshot(): RuntimeSnapshot {
    return new RuntimeSnapshot(this.stepIndex, this.currentLocation, [...this.callStack], this.trace.all(), this.globals.entries().map(([name, value]) => ({ name, value })));
  }
}

export class RuntimeSnapshot {
  public constructor(
    public readonly stepIndex: number,
    public readonly currentLocation: SourceLocation | undefined,
    public readonly callStack: readonly CallFrame[],
    public readonly events: readonly ExecutionEvent[],
    public readonly globals: readonly VariableSnapshot[],
  ) {}
}

export interface VariableSnapshot { readonly name: string; readonly value: RuntimeValue; }
