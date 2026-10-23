// Singly linked list — head → tail chain of nodes, with an O(1) tail cache.
// The class card reconstructs the chain from the projected node labels.

class ListNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class LinkedList {
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
}

let list = new LinkedList();
list.append(8);
list.append(15);
list.append(42);
list.prepend(3);
console.log("size", list.size);
console.log("head", list.head.value, "tail", list.tail.value);
