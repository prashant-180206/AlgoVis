// Two sum — hash-map lookup in a single pass.
// The map is a plain object keyed by "value", storing the index of a match.

class TwoSum {
  constructor() {
    this.seen = {};
    this.count = 0;
  }

  find(nums, target) {
    for (let index = 0; index < nums.length; index++) {
      let rest = target - nums[index];
      if (this.seen["v" + rest] !== undefined) {
        this.count++;
        return [this.seen["v" + rest], index];
      }
      this.seen["v" + nums[index]] = index;
    }
    return null;
  }
}

let finder = new TwoSum();
let numbers = [];
let source = [4, 7, 11, 2, 15, 9];
for (let index = 0; index < source.length; index++) {
  numbers.push(source[index]);
}
let pair = finder.find(numbers, 17);
console.log("numbers", numbers);
console.log("pair indexes", pair);
if (pair !== null) {
  let first = pair[0];
  let second = pair[1];
  console.log("values", numbers[first], numbers[second]);
}
