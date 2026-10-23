// Union-Find — disjoint sets with path compression and ranking.
// Kruskal-style edge scan ends the example by counting accepted edges.

class UnionFind {
  constructor(size) {
    this.parent = [];
    this.rank = [];
    this.components = size;
    for (let index = 0; index < size; index++) {
      this.parent.push(index);
      this.rank.push(0);
    }
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  union(a, b) {
    let rootA = this.find(a);
    let rootB = this.find(b);
    if (rootA === rootB) {
      return false;
    }
    if (this.rank[rootA] < this.rank[rootB]) {
      this.parent[rootA] = rootB;
    } else if (this.rank[rootA] > this.rank[rootB]) {
      this.parent[rootB] = rootA;
    } else {
      this.parent[rootB] = rootA;
      this.rank[rootA]++;
    }
    this.components--;
    return true;
  }
}

let finder = new UnionFind(6);
let edges = [];
let source = [0, 1, 1, 2, 2, 3, 0, 4, 4, 5, 3, 5, 1, 4];
for (let index = 0; index < source.length; index++) {
  edges.push(source[index]);
}
let accepted = 0;
for (let index = 0; index < edges.length; index += 2) {
  let merged = finder.union(edges[index], edges[index + 1]);
  if (merged) {
    accepted++;
  }
}
console.log("accepted", accepted, "components", finder.components);
console.log("root of 3", finder.find(3));
console.log("root of 5", finder.find(5));
