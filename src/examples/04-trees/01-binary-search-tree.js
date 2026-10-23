// Binary search tree — iterative inserts; smaller goes left, larger right.
// The class card draws the whole tree with an in-order layout.

class TreeNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

class BinarySearchTree {
  constructor() {
    this.root = null;
  }

  insert(value) {
    if (this.root === null) {
      this.root = new TreeNode(value);
      return true;
    }
    let node = this.root;
    while (node !== null) {
      if (value < node.value) {
        if (node.left === null) {
          node.left = new TreeNode(value);
          return true;
        }
        node = node.left;
      } else {
        if (node.right === null) {
          node.right = new TreeNode(value);
          return true;
        }
        node = node.right;
      }
    }
    return false;
  }
}

let tree = new BinarySearchTree();
tree.insert(50);
tree.insert(30);
tree.insert(70);
tree.insert(20);
tree.insert(40);
tree.insert(60);
tree.insert(80);
console.log("root", tree.root.value);
console.log("left subtree", tree.root.left.value, tree.root.left.left.value, tree.root.left.right.value);
console.log("right subtree", tree.root.right.value, tree.root.right.right.value);
