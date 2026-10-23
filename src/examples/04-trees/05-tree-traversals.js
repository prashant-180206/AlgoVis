// Tree traversals — one recursive method, three visit orders.
// The call-stack view flips between frames as the visits interleave.

class TreeNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

class TraversalTree {
  constructor() {
    this.root = null;
  }

  walk() {
    this.preorder = [];
    this.inorder = [];
    this.postorder = [];
    this.pre(this.root);
    this.walkIn(this.root);
    this.post(this.root);
    return this;
  }

  pre(node) {
    if (node === null) {
      return;
    }
    this.preorder.push(node.value);
    this.pre(node.left);
    this.pre(node.right);
  }

  walkIn(node) {
    if (node === null) {
      return;
    }
    this.walkIn(node.left);
    this.inorder.push(node.value);
    this.walkIn(node.right);
  }

  post(node) {
    if (node === null) {
      return;
    }
    this.post(node.left);
    this.post(node.right);
    this.postorder.push(node.value);
  }
}

function manualAdd(tree, value) {
  if (tree.root === null) {
    tree.root = new TreeNode(value);
    return true;
  }
  let node = tree.root;
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

let tree = new TraversalTree();
let source = [50, 30, 70, 20, 40, 60, 80];
for (let index = 0; index < source.length; index++) {
  manualAdd(tree, source[index]);
}
let walks = tree.walk();
console.log("preorder", walks.preorder);
console.log("inorder", walks.inorder);
console.log("postorder", walks.postorder);
