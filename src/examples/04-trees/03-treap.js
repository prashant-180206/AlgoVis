// Treap — randomized BST. Every node pairs a value with a priority
// (a deterministic rolling seed here, so the animation is reproducible).
// Inserts rotate whenever a child priority wins, which keeps the tree
// balanced on average without explicit height tracking.

class TreapNode {
  constructor(value, priority) {
    this.value = value;
    this.priority = priority;
    this.left = null;
    this.right = null;
  }
}

class Treap {
  constructor() {
    this.root = null;
    this.seed = 7;
    this.rotations = 0;
  }

  nextPriority() {
    this.seed = (this.seed * 48271) % 2147483647;
    return (this.seed % 90) + 10;
  }

  insert(value) {
    this.root = this.insertNode(this.root, value);
    return this.root;
  }

  insertNode(node, value) {
    if (node === null) {
      return new TreapNode(value, this.nextPriority());
    }
    if (value < node.value) {
      node.left = this.insertNode(node.left, value);
      if (node.left.priority > node.priority) {
        this.rotations++;
        let pivot = node.left;
        node.left = pivot.right;
        pivot.right = node;
        return pivot;
      }
      return node;
    }
    node.right = this.insertNode(node.right, value);
    if (node.right.priority > node.priority) {
      this.rotations++;
      let pivot = node.right;
      node.right = pivot.left;
      pivot.left = node;
      return pivot;
    }
    return node;
  }
}

let treap = new Treap();
let source = [50, 30, 70, 20, 40, 60, 80, 35];
for (let index = 0; index < source.length; index++) {
  treap.insert(source[index]);
}
console.log("rotations", treap.rotations);
console.log("root", treap.root.value, "priority", treap.root.priority);
