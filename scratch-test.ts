import {
  ExecutionEventType,
  Interpreter,
  Lexer,
  Parser,
  type RuntimeSnapshot,
} from "./src/core";

const source = `
let person = { name: "Ada", age: 36, nested: { score: 9 } };
let { name, age: years, nested: { score } } = person;
let [first, , third, [deep]] = [10, 20, 30, [40]];
let shorthand = { name, score };
let multiline = {
  name,
  score,
};
class Box {
  constructor({ value }) {
    this.value = value;
  }
  get() {
    return this.value;
  }
}
let box = new Box({ value: 7 });
console.log(name, years, score, first, third, deep);
console.log(shorthand.name, shorthand.score, multiline.name, box.get());
`;

const program = new Parser(new Lexer(source).tokenize()).parse();
const interpreter = new Interpreter(program);
interpreter.run();
const snapshot = interpreter.steps[interpreter.steps.length - 1] as
  | RuntimeSnapshot
  | undefined;
const output =
  snapshot?.events
    .filter((event) => event.type === ExecutionEventType.Write)
    .map((event) => event.payload?.output)
    .filter((value) => typeof value === "string") ?? [];
console.log(JSON.stringify({ status: interpreter.status, output }, null, 2));

const expected = [
  "Ada 36 9 10 30 40",
  "Ada 9 Ada 7",
];
if (JSON.stringify(output) !== JSON.stringify(expected))
  throw new Error(`Unexpected output: ${JSON.stringify(output)}`);
if (interpreter.lastError) throw interpreter.lastError;
