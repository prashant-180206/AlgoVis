// Reusable AlgoVis data structures.
//
// These files run inside the AlgoVis interpreter, not in the browser's
// JavaScript engine. Keep to the supported JavaScript-like subset. All
// top-level declarations are implicitly exported; the `export` keyword is
// accepted so the files also read like standard modules.

export class Stack {
  constructor() {
    this.items = [];
  }

  push(value) {
    this.items.push(value);
    return this.items.length;
  }

  pop() {
    return this.items.pop();
  }

  peek() {
    return this.items[this.items.length - 1];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }
}

export class Queue {
  constructor() {
    this.items = [];
    this.front = 0;
  }

  enqueue(value) {
    this.items.push(value);
    return this.size();
  }

  dequeue() {
    if (this.isEmpty()) {
      return undefined;
    }
    let value = this.items[this.front];
    this.front++;
    return value;
  }

  peek() {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.items[this.front];
  }

  isEmpty() {
    return this.front >= this.items.length;
  }

  size() {
    return this.items.length - this.front;
  }
}

export class ListNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

export class LinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  append(value) {
    let node = new ListNode(value);
    if (this.head === null) {
      this.head = node;
      this.tail = node;
    } else {
      this.tail.next = node;
      this.tail = node;
    }
    this.size++;
    return node;
  }

  prepend(value) {
    let node = new ListNode(value);
    node.next = this.head;
    this.head = node;
    if (this.tail === null) {
      this.tail = node;
    }
    this.size++;
    return node;
  }

  toArray() {
    let values = [];
    let current = this.head;
    while (current !== null) {
      values.push(current.value);
      current = current.next;
    }
    return values;
  }
}

export class TreeNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}
