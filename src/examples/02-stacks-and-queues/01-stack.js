// Stack — LIFO discipline.
// The class card renders newest-on-top tiles with a TOP marker.

class Stack {
  constructor() {
    this.items = [];
  }

  push(value) {
    this.items.push(value);
    return this.items.length;
  }

  pop() {
    if (this.items.length === 0) {
      return undefined;
    }
    return this.items.pop();
  }

  peek() {
    if (this.items.length === 0) {
      return undefined;
    }
    return this.items[this.items.length - 1];
  }
}

let stack = new Stack();
stack.push(4);
stack.push(9);
stack.push(2);
console.log("top", stack.peek());
let top = stack.pop();
console.log("popped", top);
stack.push(11);
console.log("now", stack.peek());
