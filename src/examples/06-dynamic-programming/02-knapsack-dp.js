// 0/1 knapsack — bottom-up over a rolling 1D best array.
// Capacity sweeps backwards so each item is used at most once.

class Knapsack {
  constructor(capacity) {
    this.capacity = capacity;
    this.best = [];
    for (let index = 0; index <= capacity; index++) {
      this.best.push(0);
    }
    this.considered = 0;
  }

  take(values, weights) {
    for (let item = 0; item < values.length; item++) {
      for (let budget = this.capacity; budget >= weights[item]; budget--) {
        this.considered++;
        let without = this.best[budget - weights[item]] + values[item];
        if (without > this.best[budget]) {
          this.best[budget] = without;
        }
      }
    }
    return this.best[this.capacity];
  }
}

let bag = new Knapsack(10);
let values = [];
let weights = [];
let valueSource = [10, 40, 30, 50];
let weightSource = [5, 4, 6, 3];
for (let index = 0; index < 4; index++) {
  values.push(valueSource[index]);
  weights.push(weightSource[index]);
}
let total = bag.take(values, weights);
console.log("values", values);
console.log("weights", weights);
console.log("best value", total);
console.log("considered", bag.considered);
