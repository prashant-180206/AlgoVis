// N-Queens — backtracking over a 1D board (column per row, a classic).
// Watch call frames push and pop as the search backtracks.

class Queens {
  constructor(size) {
    this.size = size;
    this.placed = [];
    for (let index = 0; index < size; index++) {
      this.placed.push(-1);
    }
    this.solutions = 0;
    this.attempts = 0;
    this.first = [];
  }

  safe(row, column) {
    for (let previous = 0; previous < row; previous++) {
      if (this.placed[previous] === column) {
        return false;
      }
      if (row - previous === column - this.placed[previous]) {
        return false;
      }
      if (row - previous === this.placed[previous] - column) {
        return false;
      }
    }
    return true;
  }

  solve() {
    this.search(0);
    return this.solutions;
  }

  search(row) {
    if (row === this.size) {
      this.solutions++;
      if (this.first.length === 0) {
        for (let index = 0; index < this.size; index++) {
          this.first.push(this.placed[index]);
        }
      }
      return true;
    }
    for (let column = 0; column < this.size; column++) {
      this.attempts++;
      if (this.safe(row, column) === true) {
        this.placed[row] = column;
        let solved = this.search(row + 1);
        if (solved === true && this.first.length === this.size) {
          return true;
        }
        this.placed[row] = -1;
      }
    }
    return false;
  }
}

let game = new Queens(5);
let count = game.solve();
console.log("solutions", count, "attempts", game.attempts);
console.log("first board columns per row", game.first);
