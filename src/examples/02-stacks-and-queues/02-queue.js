// Queue — FIFO discipline with a moving front index.
// The class card marks FRONT and REAR while the buffer grows.

class Queue {
  constructor() {
    this.items = [];
    this.front = 0;
  }

  enqueue(value) {
    this.items.push(value);
    return this.items.length - this.front;
  }

  dequeue() {
    if (this.front >= this.items.length) {
      return undefined;
    }
    let value = this.items[this.front];
    this.front++;
    return value;
  }
}

let queue = new Queue();
queue.enqueue(7);
queue.enqueue(3);
queue.enqueue(12);
console.log("next", queue.dequeue());
queue.enqueue(5);
console.log("next", queue.dequeue());
console.log("waiting", queue.enqueue(0));
