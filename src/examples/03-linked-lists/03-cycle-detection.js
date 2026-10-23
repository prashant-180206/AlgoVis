// Linked list cycle — Floyd's tortoise and hare.
// Two pointers chase each other; a loop exists if they ever meet.

class CycleFinder {
  constructor() {
    this.steps = 0;
  }

  find(head) {
    let slow = head;
    let fast = head;
    while (fast !== null) {
      slow = slow.next;
      if (fast.next === null) {
        return null;
      }
      fast = fast.next.next;
      this.steps++;
      if (slow === fast) {
        return slow;
      }
    }
    return null;
  }
}

let nodes = [];
for (let index = 0; index < 6; index++) {
  nodes.push({ value: index + 1, next: null });
}
for (let index = 0; index < 5; index++) {
  nodes[index].next = nodes[index + 1];
}
nodes[5].next = nodes[2];

let finder = new CycleFinder();
let meeting = finder.find(nodes[0]);
console.log("meeting at value", meeting.value, "after", finder.steps);
