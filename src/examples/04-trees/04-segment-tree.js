// Segment tree — build a sum tree over a static array, then answer range
// queries recursively. The tree lives in a flat 2n-sized array.

class SegmentTree {
  constructor(values) {
    this.size = values.length;
    this.items = [];
    this.nodes = [];
    let capacity = 1;
    while (capacity < this.size) {
      capacity = capacity * 2;
    }
    capacity = capacity * 2;
    for (let index = 0; index < capacity; index++) {
      this.nodes.push(0);
    }
    this.build(values, 1, 0, this.size - 1);
  }

  build(values, node, low, high) {
    if (low === high) {
      this.nodes[node] = values[low];
      return this.nodes[node];
    }
    let mid = Math.floor((low + high) / 2);
    let left = this.build(values, node * 2, low, mid);
    let right = this.build(values, node * 2 + 1, mid + 1, high);
    this.nodes[node] = left + right;
    return this.nodes[node];
  }

  query(node, low, high, start, end) {
    if (end < low || high < start) {
      return 0;
    }
    if (start <= low && high <= end) {
      return this.nodes[node];
    }
    let mid = Math.floor((low + high) / 2);
    let left = this.query(node * 2, low, mid, start, end);
    let right = this.query(node * 2 + 1, mid + 1, high, start, end);
    return left + right;
  }

  rangeSum(start, end) {
    return this.query(1, 0, this.size - 1, start, end);
  }
}

let source = [5, 3, 8, 1, 9, 2, 7];
let tree = new SegmentTree(source);
console.log(source);
console.log("sum 0..2", tree.rangeSum(0, 2));
console.log("sum 3..6", tree.rangeSum(3, 6));
console.log("sum 0..6", tree.rangeSum(0, 6));
