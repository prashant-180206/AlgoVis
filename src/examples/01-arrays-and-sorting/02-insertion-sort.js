// Insertion sort — builds a sorted prefix one card at a time.
// Great for watching values shift right before sliding into place.

class InsertionSort {
  constructor(items) {
    this.items = [];
    for (let index = 0; index < items.length; index++) {
      this.items.push(items[index]);
    }
    this.shifts = 0;
  }

  sort() {
    for (let index = 1; index < this.items.length; index++) {
      let current = this.items[index];
      let hole = index;
      while (hole > 0) {
        let previous = this.items[hole - 1];
        if (previous <= current) {
          break;
        }
        this.items[hole] = previous;
        this.shifts++;
        hole--;
      }
      this.items[hole] = current;
    }
    return this.items;
  }
}

let sorter = new InsertionSort([6, 3, 10, 1, 8, 5, 2, 9]);
let sorted = sorter.sort();
console.log(sorted);
console.log("shifts", sorter.shifts);
