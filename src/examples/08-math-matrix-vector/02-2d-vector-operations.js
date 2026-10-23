// 2D vectors — a small vector class: add, subtract, scale, dot, cross,
// length and normalize. Vectors feed physics and grid algorithms later.

class Vec2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(other) {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  subtract(other) {
    return new Vec2(this.x - other.x, this.y - other.y);
  }

  scale(factor) {
    return new Vec2(this.x * factor, this.y * factor);
  }

  dot(other) {
    return this.x * other.x + this.y * other.y;
  }

  cross(other) {
    return this.x * other.y - this.y * other.x;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    let size = this.length();
    if (size === 0) {
      return new Vec2(0, 0);
    }
    return new Vec2(this.x / size, this.y / size);
  }

  key() {
    return "(" + this.x + ", " + this.y + ")";
  }
}

let a = new Vec2(3, 4);
let b = new Vec2(-1, 2);
console.log("a", a.key(), "b", b.key());
console.log("a + b", a.add(b).key());
console.log("a - b", a.subtract(b).key());
console.log("a x 2", a.scale(2).key());
console.log("dot", a.dot(b));
console.log("cross", a.cross(b));
console.log("|a|", a.length());
console.log("a normalized", a.normalize().key());
