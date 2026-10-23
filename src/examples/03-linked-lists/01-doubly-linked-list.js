// Doubly linked list — nodes with prev and next links.
// The class card walks the chain head to tail; every node carries both links.

class ListNode {
  constructor(value) {
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

class DoublyLinkedList {
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
      node.prev = this.tail;
      this.tail.next = node;
      this.tail = node;
    }
    this.size++;
    return value;
  }

  removeTail() {
    if (this.tail === null) {
      return undefined;
    }
    let value = this.tail.value;
    if (this.tail.prev === null) {
      this.head = null;
      this.tail = null;
    } else {
      this.tail = this.tail.prev;
      this.tail.next = null;
    }
    this.size--;
    return value;
  }
}

let list = new DoublyLinkedList();
list.append(5);
list.append(9);
list.append(2);
list.append(7);
console.log("size", list.size, "tail", list.tail.value);
console.log("removed", list.removeTail());
console.log("tail", list.tail.value, "head", list.head.value);
