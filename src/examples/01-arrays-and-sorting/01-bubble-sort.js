// Bubble sort — classic O(n^2) comparison sort.
// Watch the array tiles activate as neighbours are compared and swapped.

class BubbleSort {
  constructor(items) {
    this.items = [];
    for (let index = 0; index < items.length; index++) {
      this.items.push(items[index]);
    }
    this.swaps = 0;
    this.compares = 0;
  }

  sort() {
    let length = this.items.length;
    for (let pass = 0; pass < length - 1; pass++) {
      let swapped = false;
      for (let index = 0; index < length - 1 - pass; index++) {
        this.compares++;
        if (this.items[index] > this.items[index + 1]) {
          let swap = this.items[index];
          this.items[index] = this.items[index + 1];
          this.items[index + 1] = swap;
          this.swaps++;
          swapped = true;
        }
      }
      if (swapped === false) {
        break;
      }
    }
    return this.items;
  }
}

let numbers = [];
let source = [7, 2, 9, 4, 1, 8, 3];
for (let index = 0; index < source.length; index++) {
  numbers.push(source[index]);
}

let sorter = new BubbleSort(numbers);
let sorted = sorter.sort();
console.log(sorted);
console.log("swaps", sorter.swaps, "compares", sorter.compares);
