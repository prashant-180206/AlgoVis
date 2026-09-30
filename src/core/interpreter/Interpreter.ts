import { ExecutionEventType } from "../execution/ExecutionEvent";
import {
  ArrayExpression,
  AssignmentStatement,
  BinaryExpression,
  BlockStatement,
  BreakStatement,
  CallExpression,
  ClassDeclaration,
  ContinueStatement,
  Expression,
  ExpressionStatement,
  ForStatement,
  FunctionDeclaration,
  IdentifierExpression,
  IfStatement,
  IndexExpression,
  LiteralExpression,
  MemberExpression,
  NewExpression,
  ObjectExpression,
  Program,
  ReturnStatement,
  Statement,
  ThisExpression,
  UnaryExpression,
  VariableDeclarationStatement,
  WhileStatement,
} from "../language/Ast";
import { Runtime, RuntimeSnapshot } from "../runtime/Runtime";
import {
  ArrayValue,
  ClassValue,
  FunctionValue,
  InstanceValue,
  ObjectValue,
  PrimitiveValue,
  RuntimeValue,
} from "../runtime/Values";
import { Scope } from "../runtime/Scope";

export enum InterpreterStatus {
  Ready = "READY",
  Running = "RUNNING",
  Paused = "PAUSED",
  Finished = "FINISHED",
  Failed = "FAILED",
}
class ReturnSignal {
  public constructor(public readonly value: RuntimeValue) {}
}
class BreakSignal {}
class ContinueSignal {}

export class Interpreter {
  private cursor = 0;
  private objectId = 0;
  public status = InterpreterStatus.Ready;
  public lastError?: Error;
  public readonly runtime: Runtime;
  public get history(): readonly RuntimeSnapshot[] {
    return this.runtime.snapshots;
  }
  public constructor(
    private readonly program: Program,
    runtime = new Runtime(),
  ) {
    this.runtime = runtime;
    this.installBuiltins();
    this.runtime.captureSnapshot();
  }
  public start(): RuntimeSnapshot {
    this.status = InterpreterStatus.Running;
    return this.step();
  }
  public step(): RuntimeSnapshot {
    if (
      this.status === InterpreterStatus.Finished ||
      this.cursor >= this.program.statements.length
    ) {
      this.status = InterpreterStatus.Finished;
      return this.recordSnapshot();
    }
    const statement = this.program.statements[this.cursor];
    try {
      this.runtime.emit({
        type: ExecutionEventType.Statement,
        location: statement.location,
        payload: { statementIndex: this.cursor },
      });
      this.execute(statement, this.runtime.globals);
      this.cursor += 1;
      this.status =
        this.cursor >= this.program.statements.length
          ? InterpreterStatus.Finished
          : InterpreterStatus.Paused;
      if (this.status === InterpreterStatus.Finished)
        this.runtime.emit({
          type: ExecutionEventType.ProgramFinished,
          location: statement.location,
        });
    } catch (error) {
      this.lastError =
        error instanceof Error ? error : new Error(String(error));
      this.status = InterpreterStatus.Failed;
      this.runtime.emit({
        type: ExecutionEventType.Error,
        location: statement.location,
        payload: { message: this.lastError.message },
      });
    }
    return this.recordSnapshot();
  }
  public run(): RuntimeSnapshot {
    if (this.status === InterpreterStatus.Ready)
      this.status = InterpreterStatus.Running;
    while (
      this.status === InterpreterStatus.Running ||
      this.status === InterpreterStatus.Paused
    )
      this.step();
    return this.history[this.history.length - 1] ?? this.recordSnapshot();
  }
  public pause(): void {
    if (this.status === InterpreterStatus.Running)
      this.status = InterpreterStatus.Paused;
  }
  public reset(): void {
    this.cursor = 0;
    this.status = InterpreterStatus.Ready;
    this.lastError = undefined;
    this.runtime.resetExecution();
    this.installBuiltins();
    this.runtime.captureSnapshot();
  }
  public get currentStatementIndex(): number {
    return this.cursor;
  }

  private recordSnapshot(): RuntimeSnapshot {
    return this.history[this.history.length - 1] ?? this.runtime.captureSnapshot();
  }

  private execute(statement: Statement, scope: Scope): void {
    if (statement instanceof BlockStatement) {
      const blockScope = this.createScope(scope);
      statement.statements.forEach((child) => this.execute(child, blockScope));
      return;
    }
    if (statement instanceof VariableDeclarationStatement) {
      const value = statement.initializer
        ? this.evaluate(statement.initializer, scope)
        : new PrimitiveValue(undefined);
      scope.define(statement.name, value);
      this.writeEvent(statement, statement.name, value);
      return;
    }
    if (statement instanceof AssignmentStatement) {
      const value = this.applyAssignment(statement, scope);
      this.writeEvent(statement, "assignment", value);
      return;
    }
    if (statement instanceof ExpressionStatement) {
      this.evaluate(statement.expression, scope);
      return;
    }
    if (statement instanceof IfStatement) {
      if (this.truthy(this.evaluate(statement.condition, scope)))
        this.execute(statement.thenBranch, scope);
      else if (statement.elseBranch) this.execute(statement.elseBranch, scope);
      return;
    }
    if (statement instanceof WhileStatement) {
      while (this.truthy(this.evaluate(statement.condition, scope))) {
        try {
          this.execute(statement.body, scope);
        } catch (signal) {
          if (signal instanceof BreakSignal) break;
          if (!(signal instanceof ContinueSignal)) throw signal;
        }
      }
      return;
    }
    if (statement instanceof ForStatement) {
      const loopScope = this.createScope(scope);
      if (statement.initializer instanceof Statement)
        this.execute(statement.initializer, loopScope);
      else if (statement.initializer)
        this.evaluate(statement.initializer, loopScope);
      while (
        !statement.condition ||
        this.truthy(this.evaluate(statement.condition, loopScope))
      ) {
        try {
          this.execute(statement.body, loopScope);
        } catch (signal) {
          if (signal instanceof BreakSignal) break;
          if (!(signal instanceof ContinueSignal)) throw signal;
        }
        if (statement.increment) this.evaluate(statement.increment, loopScope);
      }
      return;
    }
    if (statement instanceof FunctionDeclaration) {
      const closure = scope;
      scope.define(
        statement.name,
        new FunctionValue(
          statement.name,
          statement.parameters,
          statement.location,
          (...args) => this.invoke(statement, closure, args),
        ),
      );
      return;
    }
    if (statement instanceof ClassDeclaration) {
      const closure = scope;
      const methods = new Map(
        statement.methods.map(
          (method) =>
            [
              method.name,
              new FunctionValue(
                method.name,
                method.parameters,
                method.location,
                (...args) => this.invoke(method, closure, args),
                (receiver, args) =>
                  this.invoke(method, closure, args, receiver as InstanceValue),
              ),
            ] as const,
        ),
      );
      const classValue = new ClassValue(statement.name, methods, (args) => {
        const instance = new InstanceValue(statement.name, methods);
        const constructor = methods.get("constructor");
        if (constructor) this.invokeMethod(constructor, instance, args);
        return instance;
      });
      scope.define(statement.name, classValue);
      this.writeEvent(statement, statement.name, classValue);
      return;
    }
    if (statement instanceof ReturnStatement)
      throw new ReturnSignal(
        statement.value
          ? this.evaluate(statement.value, scope)
          : new PrimitiveValue(undefined),
      );
    if (statement instanceof BreakStatement) throw new BreakSignal();
    if (statement instanceof ContinueStatement) throw new ContinueSignal();
    throw new Error(
      `Statement '${statement.constructor.name}' is not executable.`,
    );
  }

  private invoke(
    declaration: FunctionDeclaration,
    closure: Scope,
    args: readonly RuntimeValue[],
    receiver?: InstanceValue,
  ): RuntimeValue {
    const locals = this.createScope(closure);
    if (receiver) locals.define("this", receiver);
    declaration.parameters.forEach((parameter, index) =>
      locals.define(parameter, args[index] ?? new PrimitiveValue(undefined)),
    );
    this.runtime.enterFrame({
      functionName: declaration.name,
      locals,
      callLocation: declaration.location,
    });
    this.runtime.emit({
      type: ExecutionEventType.Call,
      location: declaration.location,
      payload: { name: declaration.name, environmentId: locals.id },
    });
    let result = new PrimitiveValue(undefined) as RuntimeValue;
    let completed = false;
    try {
      this.execute(declaration.body, locals);
      result = new PrimitiveValue(undefined);
      completed = true;
    } catch (signal) {
      if (signal instanceof ReturnSignal) {
        result = signal.value;
        completed = true;
      }
      else throw signal;
    } finally {
      this.runtime.leaveFrame();
      if (completed) {
        this.runtime.emit({
          type: ExecutionEventType.Return,
          location: declaration.location,
          payload: { name: declaration.name, value: result },
        });
      }
    }
    return result;
  }
  private invokeMethod(
    method: FunctionValue,
    receiver: InstanceValue,
    args: readonly RuntimeValue[],
  ): RuntimeValue {
    return method.receiverCall
      ? method.receiverCall(receiver, args)
      : method.call(...args);
  }
  private evaluate(expression: Expression, scope: Scope): RuntimeValue {
    if (expression instanceof LiteralExpression)
      return new PrimitiveValue(expression.value);
    if (expression instanceof IdentifierExpression) {
      const value = scope.get(expression.name);
      this.runtime.emit({
        type: ExecutionEventType.Read,
        location: expression.location,
        payload: { name: expression.name, value },
      });
      return value;
    }
    if (expression instanceof ThisExpression) return scope.get("this");
    if (expression instanceof NewExpression) {
      const callee = this.evaluate(expression.callee, scope);
      const args = expression.argumentsList.map((argument) =>
        this.evaluate(argument, scope),
      );
      if (!(callee instanceof ClassValue))
        throw new Error("Only classes can be constructed with 'new'.");
      return callee.construct(args);
    }
    if (expression instanceof ArrayExpression)
      return new ArrayValue(
        `array-${++this.objectId}`,
        expression.elements.map((item) => this.evaluate(item, scope)),
      );
    if (expression instanceof ObjectExpression)
      return new ObjectValue(
        new Map(
          expression.properties.map((property) => [
            property.key,
            this.evaluate(property.value, scope),
          ]),
        ),
      );
    if (expression instanceof UnaryExpression)
      return this.evaluateUnary(expression, scope);
    if (expression instanceof BinaryExpression)
      return this.evaluateBinary(expression, scope);
    if (expression instanceof IndexExpression) {
      const object = this.evaluate(expression.object, scope);
      const index = this.primitive(this.evaluate(expression.index, scope));
      return this.readProperty(object, String(index));
    }
    if (expression instanceof MemberExpression)
      return this.member(expression, scope);
    if (expression instanceof CallExpression) {
      const callee = this.evaluate(expression.callee, scope);
      const args = expression.argumentsList.map((argument) =>
        this.evaluate(argument, scope),
      );
      if (!(callee instanceof FunctionValue))
        throw new Error("Only functions can be called.");
      return callee.call(...args);
    }
    throw new Error(
      `Expression '${expression.constructor.name}' is not executable.`,
    );
  }
  private evaluateUnary(
    expression: UnaryExpression,
    scope: Scope,
  ): RuntimeValue {
    if (expression.operator === "++" || expression.operator === "--") {
      const current = this.evaluate(expression.operand, scope);
      const next = new PrimitiveValue(
        this.number(current) + (expression.operator === "++" ? 1 : -1),
      );
      this.assign(expression.operand, next, scope);
      return expression.prefix ? next : current;
    }
    const value = this.evaluate(expression.operand, scope);
    if (expression.operator === "!")
      return new PrimitiveValue(!this.truthy(value));
    if (expression.operator === "-")
      return new PrimitiveValue(-this.number(value));
    if (expression.operator === "+")
      return new PrimitiveValue(this.number(value));
    throw new Error(`Unsupported unary operator '${expression.operator}'.`);
  }
  private evaluateBinary(
    expression: BinaryExpression,
    scope: Scope,
  ): RuntimeValue {
    if (expression.operator === "=") {
      const value = this.evaluate(expression.right, scope);
      this.assign(expression.left, value, scope);
      return value;
    }
    if (["+=", "-=", "*=", "/="].includes(expression.operator))
      return this.applyCompound(expression, scope);
    const left = this.evaluate(expression.left, scope);
    if (expression.operator === "&&")
      return this.truthy(left) ? this.evaluate(expression.right, scope) : left;
    if (expression.operator === "||")
      return this.truthy(left) ? left : this.evaluate(expression.right, scope);
    const right = this.evaluate(expression.right, scope);
    const leftValue = this.primitive(left);
    const rightValue = this.primitive(right);
    this.runtime.emit({
      type: ExecutionEventType.Compare,
      location: expression.location,
      payload: {
        operator: expression.operator,
        left: leftValue,
        right: rightValue,
      },
    });
    switch (expression.operator) {
      case "+":
        return new PrimitiveValue(
          typeof leftValue === "string" || typeof rightValue === "string"
            ? String(leftValue) + String(rightValue)
            : this.number(left) + this.number(right),
        );
      case "-":
        return new PrimitiveValue(this.number(left) - this.number(right));
      case "*":
        return new PrimitiveValue(this.number(left) * this.number(right));
      case "/":
        return new PrimitiveValue(this.number(left) / this.number(right));
      case "%":
        return new PrimitiveValue(this.number(left) % this.number(right));
      case "==":
      case "===":
        return new PrimitiveValue(leftValue === rightValue);
      case "!=":
      case "!==":
        return new PrimitiveValue(leftValue !== rightValue);
      case ">":
        return new PrimitiveValue(this.number(left) > this.number(right));
      case ">=":
        return new PrimitiveValue(this.number(left) >= this.number(right));
      case "<":
        return new PrimitiveValue(this.number(left) < this.number(right));
      case "<=":
        return new PrimitiveValue(this.number(left) <= this.number(right));
      case "in":
        return new PrimitiveValue(this.hasProperty(left, String(rightValue)));
      default:
        throw new Error(`Unsupported operator '${expression.operator}'.`);
    }
  }
  private applyCompound(
    expression: BinaryExpression,
    scope: Scope,
  ): RuntimeValue {
    const current = this.evaluate(expression.left, scope);
    const right = this.evaluate(expression.right, scope);
    const op = expression.operator[0];
    const value = this.evaluateBinary(
      new BinaryExpression(
        expression.location,
        new LiteralExpression(
          expression.left.location,
          this.primitiveValue(current),
        ),
        op,
        new LiteralExpression(
          expression.right.location,
          this.primitiveValue(right),
        ),
      ),
      scope,
    );
    this.assign(expression.left, value, scope);
    return value;
  }
  private applyAssignment(
    statement: AssignmentStatement,
    scope: Scope,
  ): RuntimeValue {
    if (statement.operator === "=") {
      const value = this.evaluate(statement.value, scope);
      this.assign(statement.target, value, scope);
      return value;
    }
    return this.applyCompound(
      new BinaryExpression(
        statement.location,
        statement.target,
        statement.operator,
        statement.value,
      ),
      scope,
    );
  }
  private assign(target: Expression, value: RuntimeValue, scope: Scope): void {
    if (target instanceof IdentifierExpression) {
      scope.defineOrAssign(target.name, value);
      return;
    }
    if (target instanceof MemberExpression) {
      const object = this.evaluate(target.object, scope);
      this.writeProperty(object, target.member, value);
      return;
    }
    if (target instanceof IndexExpression) {
      const object = this.evaluate(target.object, scope);
      const index = String(this.primitive(this.evaluate(target.index, scope)));
      this.writeProperty(object, index, value);
      return;
    }
    throw new Error("Invalid assignment target.");
  }
  private member(expression: MemberExpression, scope: Scope): RuntimeValue {
    const object = this.evaluate(expression.object, scope);
    if (object instanceof InstanceValue) {
      const field = object.properties.get(expression.member);
      if (field) return field;
      const method = object.methods.get(expression.member);
      if (method)
        return new FunctionValue(
          method.name,
          method.parameters,
          method.declarationLocation,
          (...args) => this.invokeMethod(method, object, args),
        );
    }
    if (object instanceof ArrayValue && expression.member === "length")
      return new PrimitiveValue(object.length);
    if (object instanceof ArrayValue && expression.member === "push")
      return new FunctionValue(
        "push",
        ["value"],
        expression.location,
        (...args) => {
          object.values.push(args[0] ?? new PrimitiveValue(undefined));
          return new PrimitiveValue(object.length);
        },
      );
    if (object instanceof ArrayValue && expression.member === "pop")
      return new FunctionValue(
        "pop",
        [],
        expression.location,
        () => object.values.pop() ?? new PrimitiveValue(undefined),
      );
    return this.readProperty(object, expression.member);
  }
  private readProperty(object: RuntimeValue, name: string): RuntimeValue {
    if (object instanceof ObjectValue)
      return object.properties.get(name) ?? new PrimitiveValue(undefined);
    if (object instanceof ArrayValue && /^\d+$/.test(name))
      return object.read(Number(name));
    throw new Error(`Value has no member '${name}'.`);
  }
  private writeProperty(
    object: RuntimeValue,
    name: string,
    value: RuntimeValue,
  ): void {
    if (object instanceof ObjectValue) {
      object.properties.set(name, value);
      return;
    }
    if (object instanceof ArrayValue && /^\d+$/.test(name)) {
      object.write(Number(name), value);
      return;
    }
    throw new Error(`Cannot write property '${name}'.`);
  }
  private hasProperty(object: RuntimeValue, name: string): boolean {
    return object instanceof ObjectValue
      ? object.properties.has(name)
      : object instanceof ArrayValue &&
          (name === "length" || /^\d+$/.test(name));
  }
  private installBuiltins(): void {
    this.runtime.globals.define(
      "console",
      new ObjectValue(
        new Map([
          [
            "log",
            new FunctionValue(
              "console.log",
              [],
              this.program.location,
              (...args) => {
                this.runtime.emit({
                  type: ExecutionEventType.Write,
                  location: this.program.location,
                  payload: {
                    output: args
                      .map((value) => this.primitive(value))
                      .join(" "),
                  },
                });
                return new PrimitiveValue(undefined);
              },
            ),
          ],
        ]),
      ),
    );
    this.runtime.globals.define(
      "Number",
      new FunctionValue(
        "Number",
        ["value"],
        this.program.location,
        (value) => new PrimitiveValue(this.number(value)),
      ),
    );
    this.runtime.globals.define(
      "String",
      new FunctionValue(
        "String",
        ["value"],
        this.program.location,
        (value) => new PrimitiveValue(String(this.primitive(value))),
      ),
    );
    this.runtime.globals.define(
      "Array",
      new FunctionValue(
        "Array",
        [],
        this.program.location,
        () => new ArrayValue(`array-${++this.objectId}`, []),
      ),
    );
  }
  private writeEvent(
    statement: Statement,
    name: string,
    value: RuntimeValue,
  ): void {
    this.runtime.emit({
      type: ExecutionEventType.Write,
      location: statement.location,
      payload: { name, value },
    });
  }
  private createScope(parent: Scope): Scope {
    return this.runtime.registerScope(new Scope(parent));
  }
  private primitive(value: RuntimeValue): unknown {
    if (value instanceof PrimitiveValue) return value.value;
    return value;
  }
  private primitiveValue(
    value: RuntimeValue,
  ): number | string | boolean | null | undefined {
    const primitive = this.primitive(value);
    if (
      primitive === null ||
      primitive === undefined ||
      typeof primitive === "number" ||
      typeof primitive === "string" ||
      typeof primitive === "boolean"
    )
      return primitive;
    throw new Error("Expected a primitive value.");
  }
  private number(value: RuntimeValue): number {
    const primitive = this.primitive(value);
    if (typeof primitive === "number") return primitive;
    if (typeof primitive === "string" && primitive.trim() !== "")
      return Number(primitive);
    throw new Error("Expected a number.");
  }
  private truthy(value: RuntimeValue): boolean {
    const primitive = this.primitive(value);
    return (
      primitive !== false &&
      primitive !== null &&
      primitive !== undefined &&
      primitive !== 0 &&
      primitive !== ""
    );
  }
}
