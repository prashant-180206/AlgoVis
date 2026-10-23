// Matrix operations — add, transpose, multiply and a 2x2 determinant.
// Matrices are arrays of row arrays; the array cards draw each row right away.

class Matrix {
  constructor(rows) {
    this.rows = rows.length;
    this.columns = rows[0].length;
    this.data = [];
    for (let row = 0; row < rows.length; row++) {
      let copy = [];
      for (let column = 0; column < rows[row].length; column++) {
        copy.push(rows[row][column]);
      }
      this.data.push(copy);
    }
  }

  get(row, column) {
    return this.data[row][column];
  }

  add(other) {
    let values = [];
    for (let row = 0; row < this.rows; row++) {
      let line = [];
      for (let column = 0; column < this.columns; column++) {
        line.push(this.data[row][column] + other.data[row][column]);
      }
      values.push(line);
    }
    return new Matrix(values);
  }

  transpose() {
    let values = [];
    for (let column = 0; column < this.columns; column++) {
      let line = [];
      for (let row = 0; row < this.rows; row++) {
        line.push(this.get(row, column));
      }
      values.push(line);
    }
    return new Matrix(values);
  }

  multiply(other) {
    let values = [];
    for (let row = 0; row < this.rows; row++) {
      let line = [];
      for (let column = 0; column < other.columns; column++) {
        let total = 0;
        for (let dot = 0; dot < this.columns; dot++) {
          total = total + this.get(row, dot) * other.get(dot, column);
        }
        line.push(total);
      }
      values.push(line);
    }
    return new Matrix(values);
  }
}

function determinant2(matrix) {
  let first = matrix.get(0, 0) * matrix.get(1, 1);
  let second = matrix.get(0, 1) * matrix.get(1, 0);
  return first - second;
}

let a = new Matrix([[4, 3], [2, 1]]);
let b = new Matrix([[1, 0, 2], [-1, 3, 1]]);
console.log("A", a.data);
console.log("B", b.data);
console.log("A transposed", a.transpose().data);
console.log("A x B", a.multiply(b).data);
console.log("det A", determinant2(a));
