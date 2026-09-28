import { ExecutionEventType } from "../execution/ExecutionEvent";
import { RuntimeSnapshot } from "../runtime/Runtime";
import { ArrayValue, displayValue, PrimitiveValue, RuntimeValue } from "../runtime/Values";

export interface VisualArray {
  readonly type: "array";
  readonly id: string;
  readonly label: string;
  readonly values: readonly string[];
  readonly activeIndices: readonly number[];
}

export interface VisualizationState {
  readonly objects: readonly VisualArray[];
  readonly activeOperation?: ExecutionEventType;
  readonly stepIndex: number;
}

export class VisualizationProjector {
  public project(snapshot: RuntimeSnapshot): VisualizationState {
    const objects = snapshot.globals
      .filter(({ value }) => value instanceof ArrayValue)
      .map(({ name, value }) => this.projectArray(name, value as ArrayValue));
    const lastEvent = snapshot.events[snapshot.events.length - 1];
    return { objects, activeOperation: lastEvent?.type, stepIndex: snapshot.stepIndex };
  }

  private projectArray(label: string, value: ArrayValue): VisualArray {
    return {
      type: "array",
      id: value.id,
      label,
      values: value.values.map((item) => this.display(item)),
      activeIndices: [...value.activeIndices],
    };
  }

  private display(value: RuntimeValue): string {
    return value instanceof PrimitiveValue ? displayValue(value) : displayValue(value);
  }
}
