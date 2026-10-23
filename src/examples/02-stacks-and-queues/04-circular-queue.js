// Circular queue — fixed buffer with wrap-around front/back.
// Dequeues advance the front; wrap keeps the ring balanced.

class CircularQueue {
  constructor(capacity) {
    this.items = [];
    for (let index = 0; index < capacity; index++) {
      this.items.push(null);
    }
    this.capacity = capacity;
    this.front = 0;
    this.back = 0;
    this.loaded = 0;
  }

  enqueue(value) {
    if (this.loaded === this.capacity) {
      return false;
    }
    this.items[this.back] = value;
    this.back = (this.back + 1) % this.capacity;
    this.loaded++;
    return true;
  }

  dequeue() {
    if (this.loaded === 0) {
      return undefined;
    }
    let value = this.items[this.front];
    this.items[this.front] = null;
    this.front = (this.front + 1) % this.capacity;
    this.loaded--;
    return value;
  }
}

let ring = new CircularQueue(5);
ring.enqueue(10);
ring.enqueue(20);
ring.enqueue(30);
console.log("remove", ring.dequeue());
ring.enqueue(40);
ring.enqueue(50);
ring.enqueue(60);
console.log("front", ring.dequeue());
ring.enqueue(70);
console.log("items", ring.items);
