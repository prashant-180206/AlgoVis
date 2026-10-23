// Subset sum — backtracking search for a target total.
// Prunes as soon as the running sum overshoots the target.

class SubsetSum {
  constructor(values, target) {
    this.values = [];
    for (let index = 0; index < values.length; index++) {
      this.values.push(values[index]);
    }
    this.target = target;
    this.chosen = [];
    this.visits = 0;
    this.solutions = 0;
  }

  search(index, total) {
    this.visits++;
    if (total === this.target) {
      this.solutions++;
      this.witness = [];
      for (let copy = 0; copy < this.chosen.length; copy++) {
        this.witness.push(this.chosen[copy]);
      }
      return true;
    }
    if (index >= this.values.length || total > this.target) {
      return false;
    }
    this.chosen.push(this.values[index]);
    let taken = this.search(index + 1, total + this.values[index]);
    this.chosen.pop();
    if (taken === true) {
      return true;
    }
    return this.search(index + 1, total);
  }

  solve() {
    this.search(0, 0);
    return this.solutions;
  }
}

let finder = new SubsetSum([4, 9, 6, 3, 7, 11], 22);
let found = finder.solve();
console.log("solutions", found, "visits", finder.visits);
console.log("witness", finder.witness);
