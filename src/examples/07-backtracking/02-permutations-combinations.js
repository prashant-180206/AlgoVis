// Permutations and combinations — recursive generation.
// Permutations show the call tree; combinations count nCk without duplicates.

class Generator {
  constructor() {
    this.permutations = 0;
    this.combinations = 0;
  }

  permute(values, prefix) {
    if (values.length === 0) {
      this.permutations++;
      return this.permutations;
    }
    for (let index = 0; index < values.length; index++) {
      let rest = [];
      for (let other = 0; other < values.length; other++) {
        if (other !== index) {
          rest.push(values[other]);
        }
      }
      let next = [];
      for (let copy = 0; copy < prefix.length; copy++) {
        next.push(prefix[copy]);
      }
      next.push(values[index]);
      this.permute(rest, next);
    }
    return this.permutations;
  }

  combine(n, k) {
    this.select(1, 0, n, k);
    return this.combinations;
  }

  select(start, taken, n, k) {
    if (taken === k) {
      this.combinations++;
      return this.combinations;
    }
    if (start > n) {
      return this.combinations;
    }
    this.select(start + 1, taken + 1, n, k);
    this.select(start + 1, taken, n, k);
    return this.combinations;
  }
}

let generator = new Generator();
let letters = [];
letters.push("A");
letters.push("B");
letters.push("C");
letters.push("D");
let total = generator.permute(letters, []);
console.log("permutations of ABCD", total);
let pairs = generator.combine(5, 3);
console.log("ways to choose 3 of 5", pairs);
