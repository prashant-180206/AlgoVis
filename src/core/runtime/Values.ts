import { SourceLocation } from "../language/SourceLocation";
import type { BindingPattern, TypeReference } from "../language/Ast";

export type RuntimePrimitive = number | string | boolean | null | undefined;
export type RuntimeValue =
  | PrimitiveValue
  | ArrayValue
  | ArrayPointerValue
  | ObjectValue
  | InstanceValue
  | ClassValue
  | FunctionValue;

export abstract class RuntimeObject {
  public abstract readonly runtimeType: string;
}

export class PrimitiveValue extends RuntimeObject {
  public readonly value: RuntimePrimitive;
  public constructor(value: RuntimePrimitive) {
    super();
    this.value = value;
  }
  public get runtimeType(): string {
    return this.value === null
      ? "Null"
      : typeof this.value === "number"
        ? "Number"
        : typeof this.value === "string"
          ? "String"
          : "Boolean";
  }
}

export class ArrayValue extends RuntimeObject {
  public readonly kind = "array" as const;
  public readonly runtimeType = "Array";
  public readonly id: string;
  public readonly values: RuntimeValue[];
  public readonly activeIndices: Set<number>;
  public elementType?: TypeReference;
  public constructor(
    id: string,
    values: RuntimeValue[],
    activeIndices: Set<number> = new Set(),
    elementType?: TypeReference,
  ) {
    super();
    this.id = id;
    this.values = values;
    this.activeIndices = activeIndices;
    this.elementType = elementType;
  }

  public copy(): ArrayValue {
    return new ArrayValue(
      this.id,
      [...this.values],
      new Set(this.activeIndices),
      this.elementType,
    );
  }

  public read(index: number): RuntimeValue {
    this.assertIndex(index);
    return this.values[index];
  }

  public write(index: number, value: RuntimeValue): void {
    this.assertIndex(index);
    this.values[index] = value;
  }

  public activate(...indices: number[]): void {
    indices.forEach((index) => this.assertIndex(index));
    indices.forEach((index) => this.activeIndices.add(index));
  }
  public clearActive(): void {
    this.activeIndices.clear();
  }
  public get length(): number {
    return this.values.length;
  }

  private assertIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.values.length)
      throw new Error(`Array index ${index} is out of bounds.`);
  }
}

export class ObjectValue extends RuntimeObject {
  public readonly runtimeType: string = "Object";
  public constructor(
    public readonly properties: Map<string, RuntimeValue> = new Map(),
  ) {
    super();
  }
}

export class InstanceValue extends ObjectValue {
  public readonly runtimeType = "Instance";
  public constructor(
    public readonly className: string,
    public readonly methods: ReadonlyMap<string, FunctionValue>,
    properties: Map<string, RuntimeValue> = new Map(),
  ) {
    super(properties);
  }
}

export class ClassValue extends RuntimeObject {
  public readonly runtimeType = "Class";
  public constructor(
    public readonly name: string,
    public readonly methods: ReadonlyMap<string, FunctionValue>,
    public readonly construct: (
      argumentsList: readonly RuntimeValue[],
    ) => InstanceValue,
  ) {
    super();
  }
}

export class ArrayPointerValue extends RuntimeObject {
  public readonly runtimeType = "ArrayPointer";
  public readonly array: ArrayValue;
  public index: number;
  public constructor(array: ArrayValue, index: number) {
    super();
    this.array = array;
    this.index = index;
  }

  public get value(): RuntimeValue {
    return this.array.read(this.index);
  }
  public set value(next: RuntimeValue) {
    this.array.write(this.index, next);
  }
}

export class FunctionValue extends RuntimeObject {
  public readonly kind = "function" as const;
  public readonly runtimeType = "Function";
  public readonly name: string;
  public readonly parameters: readonly (string | BindingPattern)[];
  public readonly declarationLocation: SourceLocation;
  public readonly call: (...argumentsList: RuntimeValue[]) => RuntimeValue;
  public readonly receiverCall?: (
    receiver: RuntimeObject,
    argumentsList: readonly RuntimeValue[],
  ) => RuntimeValue;
  public constructor(
    name: string,
    parameters: readonly (string | BindingPattern)[],
    declarationLocation: SourceLocation,
    call: (...argumentsList: RuntimeValue[]) => RuntimeValue,
    receiverCall?: (
      receiver: RuntimeObject,
      argumentsList: readonly RuntimeValue[],
    ) => RuntimeValue,
  ) {
    super();
    this.name = name;
    this.parameters = parameters;
    this.declarationLocation = declarationLocation;
    this.call = call;
    this.receiverCall = receiverCall;
  }
}

export function displayValue(
  value: RuntimeValue,
  seen = new WeakSet<RuntimeObject>(),
): string {
  if (value instanceof ArrayValue) {
    if (seen.has(value)) return "[↻]";
    seen.add(value);
    const result = `[${value.values.map((item) => displayValue(item, seen)).join(", ")}]`;
    seen.delete(value);
    return result;
  }
  if (value instanceof ArrayPointerValue)
    return `&${value.array.id}[${value.index}]`;
  if (value instanceof FunctionValue) return `<function ${value.name}>`;
  if (value instanceof ClassValue) return `<class ${value.name}>`;
  if (value instanceof InstanceValue) {
    if (seen.has(value)) return `<${value.className} ↻>`;
    seen.add(value);
    const result = `<${value.className} ${displayProperties(value.properties, seen)}>`;
    seen.delete(value);
    return result;
  }
  if (value instanceof ObjectValue) {
    if (seen.has(value)) return "{↻}";
    seen.add(value);
    const result = displayProperties(value.properties, seen);
    seen.delete(value);
    return result;
  }
  return value.value === null
    ? "null"
    : value.value === undefined
      ? "undefined"
      : String(value.value);
}

function displayProperties(
  properties: ReadonlyMap<string, RuntimeValue>,
  seen: WeakSet<RuntimeObject>,
): string {
  return `{${[...properties.entries()]
    .map(([key, item]) => `${key}: ${displayValue(item, seen)}`)
    .join(", ")}}`;
}
