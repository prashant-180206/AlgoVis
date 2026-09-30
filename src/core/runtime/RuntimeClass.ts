import { TypeReference } from "../language/Ast";
import type { Runtime } from "./Runtime";
import {
  ArrayPointerValue,
  ArrayValue,
  ClassValue,
  InstanceValue,
  ObjectValue,
  PrimitiveValue,
  RuntimeObject,
  RuntimeValue,
  StackValue,
} from "./Values";

export type RuntimeMethod = (
  receiver: RuntimeObject,
  argumentsList: readonly RuntimeValue[],
  runtime: Runtime,
) => RuntimeValue;

export interface RuntimeClassDefinition {
  readonly name: string;
  readonly methods: ReadonlyMap<string, RuntimeMethod>;
  readonly isAssignable?: (
    value: RuntimeValue,
    type: TypeReference,
    registry: RuntimeClassRegistry,
  ) => boolean;
}

export class RuntimeClassRegistry {
  private readonly definitions = new Map<string, RuntimeClassDefinition>();

  public register(definition: RuntimeClassDefinition): void {
    this.definitions.set(definition.name, definition);
  }

  public registerMethods(
    name: string,
    methods: ReadonlyMap<string, RuntimeMethod>,
  ): void {
    const definition = this.get(name);
    this.register({
      ...definition,
      methods: new Map([...definition.methods, ...methods]),
    });
  }

  public get(name: string): RuntimeClassDefinition {
    const definition = this.definitions.get(name);
    if (!definition) throw new Error(`Unknown runtime type '${name}'.`);
    return definition;
  }

  public resolveMethod(receiver: RuntimeObject, name: string): RuntimeMethod {
    const method = this.get(receiver.runtimeType).methods.get(name);
    if (!method)
      throw new Error(
        `Type '${receiver.runtimeType}' has no method '${name}'.`,
      );
    return method;
  }

  public isAssignable(value: RuntimeValue, type: TypeReference): boolean {
    const definition = this.definitions.get(type.name);
    if (!definition) return false;
    return (
      definition.isAssignable?.(value, type, this) ??
      value.runtimeType === type.name
    );
  }

  public registerBuiltins(): void {
    this.register({
      name: "Number",
      methods: new Map(),
      isAssignable: (value) =>
        value instanceof PrimitiveValue && typeof value.value === "number",
    });
    this.register({
      name: "String",
      methods: new Map(),
      isAssignable: (value) =>
        value instanceof PrimitiveValue && typeof value.value === "string",
    });
    this.register({
      name: "Boolean",
      methods: new Map(),
      isAssignable: (value) =>
        value instanceof PrimitiveValue && typeof value.value === "boolean",
    });
    this.register({
      name: "Null",
      methods: new Map(),
      isAssignable: (value) =>
        value instanceof PrimitiveValue && value.value === null,
    });
    this.register({
      name: "Undefined",
      methods: new Map(),
      isAssignable: (value) =>
        value instanceof PrimitiveValue && value.value === undefined,
    });
    this.register({
      name: "Object",
      methods: new Map(),
      isAssignable: (value) => value instanceof ObjectValue,
    });
    this.register({
      name: "Class",
      methods: new Map(),
      isAssignable: (value) => value instanceof ClassValue,
    });
    this.register({
      name: "Instance",
      methods: new Map(),
      isAssignable: (value) => value instanceof InstanceValue,
    });
    this.register({
      name: "ArrayPointer",
      methods: new Map(),
      isAssignable: (value) => value instanceof ArrayPointerValue,
    });
    this.register({
      name: "Array",
      methods: new Map(),
      isAssignable: (value, type, registry) =>
        value instanceof ArrayValue &&
        (type.typeArguments.length === 0 ||
          value.values.every((item) =>
            registry.isAssignable(item, type.typeArguments[0]),
          )),
    });
    this.register({
      name: "Stack",
      methods: new Map(),
      isAssignable: (value, type, registry) =>
        value instanceof StackValue &&
        (type.typeArguments.length === 0 ||
          value.values.every((item) =>
            registry.isAssignable(item, type.typeArguments[0]),
          )),
    });
  }
}
