// Quicksort — in-place, with a real recursion chain.
// Each partition call nests under its caller in the environment tree, so the
// visualization shows the divide and conquer structure directly.

class QuickSort {
  constructor(items) {
    this.items = [];
    for (let index = 0; index < items.length; index++) {
      this.items.push(items[index]);
    }
    this.partitionCalls = 0;
  }

  sort() {
    this.sortRange(0, this.items.length - 1);
    return this.items;
  }

  sortRange(low, high) {
    if (low >= high) {
      return low;
    }
    let pivotIndex = this.partition(low, high);
    this.sortRange(low, pivotIndex - 1);
    this.sortRange(pivotIndex + 1, high);
    return pivotIndex;
  }

  partition(low, high) {
    this.partitionCalls++;
    let pivot = this.items[high];
    let boundary = low - 1;
    for (let index = low; index < high; index++) {
      if (this.items[index] <= pivot) {
        boundary++;
        let swap = this.items[boundary];
        this.items[boundary] = this.items[index];
        this.items[index] = swap;
      }
    }
    let swap = this.items[boundary + 1];
    this.items[boundary + 1] = this.items[high];
    this.items[high] = swap;
    return boundary + 1;
  }
}

let sorter = new QuickSort([9, 3, 5, 8, 2, 7, 1, 6, 4]);
let sorted = sorter.sort();
console.log(sorted);
console.log("partitions", sorter.partitionCalls);
