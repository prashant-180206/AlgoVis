import { ExecutionEventType } from "../execution/ExecutionEvent";
import { RuntimeSnapshot } from "../runtime/Runtime";
import {
  ArrayValue,
  displayValue,
  InstanceValue,
  ObjectValue,
  PrimitiveValue,
  RuntimeObject,
  RuntimeValue,
} from "../runtime/Values";

export interface VisualVariable {
  readonly name: string;
  readonly value: string;
  readonly runtimeType?: string;
  readonly objectId?: string;
  readonly className?: string;
  readonly isObject?: boolean;
  readonly builtin?: boolean;
}

export interface VisualEnvironment {
  readonly id: string;
  readonly parentId?: string;
  readonly kind: "global" | "module" | "function" | "block";
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

export type VisualObjectNode = VisualArray | VisualInstance | VisualObject;

export interface VisualizationState {
  readonly environments: readonly VisualEnvironment[];
  readonly objects: readonly VisualObjectNode[];
  readonly activeOperation?: ExecutionEventType;
  readonly stepIndex: number;
  readonly rootEnvironmentId?: string;
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
    const seen = new WeakSet<RuntimeObject>();
    snapshot.environments.forEach((environment) =>
      environment.variables.forEach((variable) => {
        if (!variable.builtin)
          this.projectObject(variable.name, variable.value, objects, seen);
      }),
    );
    const lastEvent = snapshot.events[snapshot.events.length - 1];
    return {
      environments,
      objects,
      activeOperation: lastEvent?.type,
      stepIndex: snapshot.stepIndex,
      rootEnvironmentId: snapshot.globalEnvironmentId,
    };
  }

  private projectObject(
    label: string,
    value: RuntimeValue,
    objects: VisualObjectNode[],
    seen: WeakSet<RuntimeObject>,
  ): void {
    if (value instanceof ArrayValue) {
      if (seen.has(value)) return;
      seen.add(value);
      objects.push(this.projectArray(label, value));
      return;
    }
    if (value instanceof InstanceValue) {
      if (seen.has(value)) return;
      seen.add(value);
      objects.push({
        type: "instance",
        id: `${value.className}:${label}`,
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
      if (seen.has(value)) return;
      seen.add(value);
      objects.push({
        type: "object",
        id: `object:${label}`,
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
    seen: WeakSet<RuntimeObject>,
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
      builtin?: boolean;
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
      builtin: snapshot?.builtin,
    };
  }

  private display(value: RuntimeValue): string {
    return displayValue(value);
  }
}
