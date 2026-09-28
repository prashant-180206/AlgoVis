import { ExecutionEventType } from "../execution/ExecutionEvent";
import { ArrayExpression, AssignmentStatement, BinaryExpression, CallExpression, Expression, ExpressionStatement, IdentifierExpression, IndexExpression, LiteralExpression, Program, Statement } from "../language/Ast";
import { Runtime, RuntimeSnapshot } from "../runtime/Runtime";
import { ArrayValue, FunctionValue, PrimitiveValue, RuntimeValue } from "../runtime/Values";

export enum InterpreterStatus { Ready = "READY", Running = "RUNNING", Paused = "PAUSED", Finished = "FINISHED", Failed = "FAILED" }

export class Interpreter {
  private cursor = 0;
  private arrayId = 0;
  public status = InterpreterStatus.Ready;
  public lastError?: Error;
  public readonly runtime: Runtime;

  public constructor(private readonly program: Program, runtime = new Runtime()) {
    this.runtime = runtime;
    this.installBuiltins();
  }

  public start(): RuntimeSnapshot { this.status = InterpreterStatus.Running; return this.step(); }

  public step(): RuntimeSnapshot {
    if (this.status === InterpreterStatus.Finished || this.cursor >= this.program.statements.length) {
      this.status = InterpreterStatus.Finished;
      return this.runtime.snapshot();
    }
    const statement = this.program.statements[this.cursor];
    try {
      this.runtime.emit({ type: ExecutionEventType.Statement, location: statement.location, payload: { statementIndex: this.cursor } });
      this.execute(statement);
      this.cursor += 1;
      this.status = this.cursor >= this.program.statements.length ? InterpreterStatus.Finished : InterpreterStatus.Paused;
      if (this.status === InterpreterStatus.Finished) this.runtime.emit({ type: ExecutionEventType.ProgramFinished, location: statement.location });
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      this.status = InterpreterStatus.Failed;
      this.runtime.emit({ type: ExecutionEventType.Error, location: statement.location, payload: { message: this.lastError.message } });
    }
    return this.runtime.snapshot();
  }

  public run(): RuntimeSnapshot {
    if (this.status === InterpreterStatus.Ready) this.status = InterpreterStatus.Running;
    while (this.status === InterpreterStatus.Running || this.status === InterpreterStatus.Paused) this.step();
    return this.runtime.snapshot();
  }

  public pause(): void { if (this.status === InterpreterStatus.Running) this.status = InterpreterStatus.Paused; }
  public reset(): void { this.cursor = 0; this.status = InterpreterStatus.Ready; this.lastError = undefined; this.runtime.stepIndex = 0; this.runtime.currentLocation = undefined; this.runtime.trace.clear(); }
  public get currentStatementIndex(): number { return this.cursor; }

  private execute(statement: Statement): void {
    if (statement instanceof AssignmentStatement) {
      const value = this.evaluate(statement.value);
      this.runtime.globals.defineOrAssign(statement.target.name, value);
      this.runtime.emit({ type: ExecutionEventType.Write, location: statement.location, payload: { name: statement.target.name, value } });
    } else if (statement instanceof ExpressionStatement) {
      this.evaluate(statement.expression);
    } else {
      throw new Error(`Statement '${statement.constructor.name}' is not executable yet.`);
    }
  }

  private evaluate(expression: Expression): RuntimeValue {
    if (expression instanceof LiteralExpression) return new PrimitiveValue(expression.value);
    if (expression instanceof IdentifierExpression) {
      const value = this.runtime.globals.get(expression.name);
      this.runtime.emit({ type: ExecutionEventType.Read, location: expression.location, payload: { name: expression.name, value } });
      return value;
    }
    if (expression instanceof ArrayExpression) return new ArrayValue(`array-${++this.arrayId}`, expression.elements.map((element) => this.evaluate(element)));
    if (expression instanceof IndexExpression) {
      const object = this.asArray(this.evaluate(expression.object));
      const index = this.asNumber(this.evaluate(expression.index));
      const value = object.read(index);
      object.activate(index);
      this.runtime.emit({ type: ExecutionEventType.Read, location: expression.location, payload: { structureId: object.id, index, value } });
      return value;
    }
    if (expression instanceof BinaryExpression) return this.evaluateBinary(expression);
    if (expression instanceof CallExpression) {
      const callee = this.evaluate(expression.callee);
      const argumentsList = expression.argumentsList.map((argument) => this.evaluate(argument));
      if (!(callee instanceof FunctionValue)) throw new Error("Only functions can be called.");
      this.runtime.emit({ type: ExecutionEventType.Call, location: expression.location, payload: { name: callee.name, argumentCount: argumentsList.length } });
      return callee.call(...argumentsList);
    }
    throw new Error(`Expression '${expression.constructor.name}' is not executable yet.`);
  }

  private evaluateBinary(expression: BinaryExpression): RuntimeValue {
    const left = this.asPrimitive(this.evaluate(expression.left));
    const right = this.asPrimitive(this.evaluate(expression.right));
    this.runtime.emit({ type: ExecutionEventType.Compare, location: expression.location, payload: { operator: expression.operator, left, right } });
    switch (expression.operator) {
      case "+": return new PrimitiveValue(this.asNumber(left) + this.asNumber(right));
      case "-": return new PrimitiveValue(this.asNumber(left) - this.asNumber(right));
      case "*": return new PrimitiveValue(this.asNumber(left) * this.asNumber(right));
      case "/": return new PrimitiveValue(this.asNumber(left) / this.asNumber(right));
      case "==": return new PrimitiveValue(left === right);
      case "!=": return new PrimitiveValue(left !== right);
      case ">": return new PrimitiveValue(this.asNumber(left) > this.asNumber(right));
      case ">=": return new PrimitiveValue(this.asNumber(left) >= this.asNumber(right));
      case "<": return new PrimitiveValue(this.asNumber(left) < this.asNumber(right));
      case "<=": return new PrimitiveValue(this.asNumber(left) <= this.asNumber(right));
      default: throw new Error(`Unsupported operator '${expression.operator}'.`);
    }
  }

  private installBuiltins(): void {
    this.runtime.globals.define("Array", new FunctionValue("Array", ["values"], this.program.location, (values) => {
      const source = this.asArray(values);
      return new ArrayValue(`array-${++this.arrayId}`, [...source.values]);
    }));
    this.runtime.globals.define("len", new FunctionValue("len", ["value"], this.program.location, (value) => new PrimitiveValue(this.asArray(value).length)));
    this.runtime.globals.define("compare", new FunctionValue("compare", ["left", "right"], this.program.location, () => new PrimitiveValue(null)));
  }

  private asPrimitive(value: RuntimeValue): number | string | boolean | null { if (value instanceof PrimitiveValue) return value.value; throw new Error("Expected a primitive value."); }
  private asNumber(value: RuntimeValue | number | string | boolean | null): number { if (typeof value === "number") return value; if (value instanceof PrimitiveValue && typeof value.value === "number") return value.value; throw new Error("Expected a number."); }
  private asArray(value: RuntimeValue): ArrayValue { if (value instanceof ArrayValue) return value; throw new Error("Expected an array."); }
}
