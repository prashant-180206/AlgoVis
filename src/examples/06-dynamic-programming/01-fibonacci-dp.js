// Fibonacci — naive recursion vs memoized vs bottom-up table.
// Step through and watch how many duplicated call frames naive recursion
// creates, then compare with memoization.

class Fib {
  constructor() {
    this.naiveCalls = 0;
    this.memoCalls = 0;
    this.store = {};
  }

  naive(n) {
    this.naiveCalls++;
    if (n <= 1) {
      return n;
    }
    return this.naive(n - 1) + this.naive(n - 2);
  }

  memoized(n) {
    if (this.store["f" + n] !== undefined) {
      return this.store["f" + n];
    }
    this.memoCalls++;
    if (n <= 1) {
      this.store["f" + n] = n;
      return n;
    }
    this.store["f" + n] = this.memoized(n - 1) + this.memoized(n - 2);
    return this.store["f" + n];
  }

  table(n) {
    if (n <= 1) {
      return n;
    }
    let values = [];
    values.push(0);
    values.push(1);
    for (let index = 2; index <= n; index++) {
      values.push(values[index - 1] + values[index - 2]);
    }
    return values[n];
  }
}

let fib = new Fib();
console.log("naive f(10)", fib.naive(10), "calls", fib.naiveCalls);
console.log("memo f(10)", fib.memoized(10), "calls", fib.memoCalls);
console.log("table f(10)", fib.table(10));
