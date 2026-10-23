// Coin change — fewest coins for an amount (bottom-up DP).
// Each amount tracks the best coin count so far and the coin used last.

class CoinChange {
  constructor(amount) {
    this.amount = amount;
    this.best = [];
    this.used = [];
    for (let value = 0; value <= amount; value++) {
      this.best.push(-1);
      this.used.push(0);
    }
    this.best[0] = 0;
  }

  solve(coins) {
    for (let value = 1; value <= this.amount; value++) {
      for (let index = 0; index < coins.length; index++) {
        let coin = coins[index];
        if (coin > value || this.best[value - coin] === -1) {
          continue;
        }
        let candidate = this.best[value - coin] + 1;
        if (this.best[value] === -1 || candidate < this.best[value]) {
          this.best[value] = candidate;
          this.used[value] = coin;
        }
      }
    }
    if (this.best[this.amount] === -1) {
      return null;
    }
    let change = [];
    let remaining = this.amount;
    while (remaining > 0) {
      change.push(this.used[remaining]);
      remaining = remaining - this.used[remaining];
    }
    return change;
  }
}

let changer = new CoinChange(28);
let coins = [];
let coinSource = [25, 10, 5, 1];
for (let index = 0; index < coinSource.length; index++) {
  coins.push(coinSource[index]);
}
let change = changer.solve(coins);
console.log("change for 28", change);
console.log("coins used", changer.best[28]);
console.log("best per amount", changer.best);
