// Longest increasing subsequence — O(n^2) DP with a parent chain.
// Each element compares against every earlier smaller value.

class Lis {
  constructor(values) {
    this.values = [];
    for (let index = 0; index < values.length; index++) {
      this.values.push(values[index]);
    }
    this.lengths = [];
    this.parents = [];
  }

  solve() {
    let count = this.values.length;
    for (let index = 0; index < count; index++) {
      this.lengths.push(1);
      this.parents.push(-1);
    }
    let bestIndex = 0;
    for (let index = 1; index < count; index++) {
      for (let previous = 0; previous < index; previous++) {
        if (this.values[previous] < this.values[index]) {
          let candidate = this.lengths[previous] + 1;
          if (candidate > this.lengths[index]) {
            this.lengths[index] = candidate;
            this.parents[index] = previous;
          }
        }
      }
      if (this.lengths[index] > this.lengths[bestIndex]) {
        bestIndex = index;
      }
    }
    let sequence = [];
    let cursor = bestIndex;
    while (cursor !== -1) {
      sequence.push(0);
      cursor = this.parents[cursor];
    }
    let cursor2 = bestIndex;
    for (let slot = sequence.length - 1; slot >= 0; slot--) {
      sequence[slot] = this.values[cursor2];
      cursor2 = this.parents[cursor2];
    }
    return sequence;
  }
}

let finder = new Lis([9, 2, 5, 3, 7, 11, 8, 10, 13, 6]);
let sequence = finder.solve();
console.log("values", finder.values);
console.log("lengths", finder.lengths);
console.log("best", sequence);
