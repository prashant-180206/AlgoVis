// Monotonic stack — span of stock prices.
// Pop weaker prices; each surviving index remembers a taller day.

class PriceSpan {
  constructor() {
    this.prices = [];
    this.stacks = [];
    this.spans = [];
  }

  next(price) {
    let span = 1;
    while (this.stacks.length > 0) {
      let previous = this.stacks[this.stacks.length - 1];
      if (previous <= price) {
        span = span + this.spans[this.spans.length - 1];
        this.stacks.pop();
      } else {
        break;
      }
    }
    this.stacks.push(price);
    this.spans.push(span);
    this.prices.push(price);
    return span;
  }
}

let feed = new PriceSpan();
let prices = [];
let source = [12, 13, 10, 7, 8, 16, 3];
for (let index = 0; index < source.length; index++) {
  prices.push(feed.next(source[index]));
}
console.log("prices", prices);
console.log("spans", feed.spans);
