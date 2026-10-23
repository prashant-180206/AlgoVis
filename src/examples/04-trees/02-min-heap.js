// Min heap — sift-up insertion over a flat array.
// The class card draws the array as an indexed tree, smallest value on top.

class MinHeap {
  constructor() {
    this.items = [];
  }

  insert(value) {
    this.items.push(value);
    this.siftUp(this.items.length - 1);
    return this.items.length;
  }

  siftUp(index) {
    while (index > 0) {
      let parent = Math.floor((index - 1) / 2);
      if (this.items[parent] <= this.items[index]) {
        return index;
      }
      let swap = this.items[parent];
      this.items[parent] = this.items[index];
      this.items[index] = swap;
      index = parent;
    }
    return index;
  }

  extractMin() {
    if (this.items.length === 0) {
      return undefined;
    }
    let min = this.items[0];
    let last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      this.siftDown(0);
    }
    return min;
  }

  siftDown(index) {
    let length = this.items.length;
    while (index * 2 + 1 < length) {
      let child = index * 2 + 1;
      if (child + 1 < length && this.items[child + 1] < this.items[child]) {
        child++;
      }
      if (this.items[index] <= this.items[child]) {
        return index;
      }
      let swap = this.items[index];
      this.items[index] = this.items[child];
      this.items[child] = swap;
      index = child;
    }
    return index;
  }
}

let heap = new MinHeap();
heap.insert(9);
heap.insert(4);
heap.insert(11);
heap.insert(2);
heap.insert(7);
heap.insert(1);
heap.insert(13);
console.log(heap.items);
console.log("extract", heap.extractMin(), heap.extractMin());
console.log(heap.items);
