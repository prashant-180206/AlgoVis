import { ExecutionEventType } from "../execution/ExecutionEvent";
import { RuntimeSnapshot } from "../runtime/Runtime";
import {
  ArrayValue,
  displayValue,
  InstanceValue,
  ObjectValue,
  PrimitiveValue,
  RuntimeValue,
} from "../runtime/Values";

export interface VisualVariable {
  readonly name: string;
  readonly value: string;
  readonly runtimeType?: string;
  readonly objectId?: string;
  readonly className?: string;
  readonly isObject?: boolean;
}

export interface VisualEnvironment {
  readonly id: string;
  readonly parentId?: string;
  readonly kind: "global" | "function" | "block";
  readonly active: boolean;
  readonly variables: readonly VisualVariable[];
}

export interface VisualArray {
  readonly type: "array";
  readonly id: string;
  readonly label: string;
  readonly values: readonly string[];
  readonly activeIndices: readonly number[];
}

export interface VisualStack {
  readonly type: "stack";
  readonly id: string;
  readonly label: string;
  readonly values: readonly string[];
}

export interface VisualInstance {
  readonly type: "instance";
  readonly id: string;
  readonly label: string;
  readonly className: string;
  readonly fields: readonly VisualVariable[];
}

export interface VisualObject {
  readonly type: "object";
  readonly id: string;
  readonly label: string;
  readonly fields: readonly VisualVariable[];
}

export type VisualObjectNode =
  | VisualArray
  | VisualStack
  | VisualInstance
  | VisualObject;

export interface VisualizationState {
  readonly environments: readonly VisualEnvironment[];
  readonly objects: readonly VisualObjectNode[];
  readonly activeOperation?: ExecutionEventType;
  readonly stepIndex: number;
}

export class VisualizationProjector {
  public project(snapshot: RuntimeSnapshot): VisualizationState {
    const environments = snapshot.environments.map((environment) => ({
      id: environment.id,
      parentId: environment.parentId,
      kind: environment.kind,
      active: environment.active,
      variables: environment.variables.map((variable) =>
        this.projectVariable(variable.name, variable.value, variable),
      ),
    }));
    const objects: VisualObjectNode[] = [];
    const seen = new Set<string>();
    snapshot.environments.forEach((environment) =>
      environment.variables.forEach((variable) =>
        this.projectObject(variable.name, variable.value, objects, seen),
      ),
    );
    const lastEvent = snapshot.events[snapshot.events.length - 1];
    return {
      environments,
      objects,
      activeOperation: lastEvent?.type,
      stepIndex: snapshot.stepIndex,
    };
  }

  private projectObject(
    label: string,
    value: RuntimeValue,
    objects: VisualObjectNode[],
    seen: Set<string>,
  ): void {
    if (value instanceof ArrayValue) {
      if (seen.has(value.id)) return;
      seen.add(value.id);
      objects.push(this.projectArray(label, value));
      return;
    }
    if (value instanceof InstanceValue) {
      const id = `${value.className}:${label}`;
      if (seen.has(id)) return;
      seen.add(id);
      objects.push({
        type: "instance",
        id,
        label,
        className: value.className,
        fields: [...value.properties.entries()].map(([name, item]) =>
          this.projectVariable(name, item),
        ),
      });
      value.properties.forEach((item, name) =>
        this.projectNested(`${label}.${name}`, item, objects, seen),
      );
      return;
    }
    if (value instanceof ObjectValue) {
      const id = `object:${label}`;
      if (seen.has(id)) return;
      seen.add(id);
      objects.push({
        type: "object",
        id,
        label,
        fields: [...value.properties.entries()].map(([name, item]) =>
          this.projectVariable(name, item),
        ),
      });
      value.properties.forEach((item, name) =>
        this.projectNested(`${label}.${name}`, item, objects, seen),
      );
    }
  }

  private projectNested(
    label: string,
    value: RuntimeValue,
    objects: VisualObjectNode[],
    seen: Set<string>,
  ): void {
    if (
      value instanceof ArrayValue ||
      value instanceof InstanceValue ||
      value instanceof ObjectValue
    )
      this.projectObject(label, value, objects, seen);
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

  private projectVariable(
    name: string,
    value: RuntimeValue,
    snapshot?: {
      runtimeType?: string;
      objectId?: string;
      className?: string;
      isObject?: boolean;
    },
  ): VisualVariable {
    return {
      name,
      value: this.display(value),
      runtimeType: snapshot?.runtimeType ?? value.runtimeType,
      objectId: snapshot?.objectId,
      className:
        snapshot?.className ??
        (value instanceof InstanceValue ? value.className : undefined),
      isObject: snapshot?.isObject ?? !(value instanceof PrimitiveValue),
    };
  }

  private display(value: RuntimeValue): string {
    return displayValue(value);
  }
}
