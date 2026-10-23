// Topological sort — Kahn's algorithm on a directed acyclic graph.
// Repeatedly take vertices with zero in-degree and release their edges.

class TopologicalSort {
  constructor() {
    this.adjacency = {};
    this.degree = {};
    this.vertexes = [];
  }

  addEdge(a, b) {
    if (this.adjacency[a] === undefined) {
      this.adjacency[a] = [];
      this.degree[a] = 0;
      this.vertexes.push(a);
    }
    if (this.adjacency[b] === undefined) {
      this.adjacency[b] = [];
      this.degree[b] = 0;
      this.vertexes.push(b);
    }
    this.adjacency[a].push(b);
    this.degree[b]++;
    return this.degree[b];
  }

  sort() {
    let order = [];
    let queue = [];
    for (let index = 0; index < this.vertexes.length; index++) {
      let vertex = this.vertexes[index];
      if (this.degree[vertex] === 0) {
        queue.push(vertex);
      }
    }
    while (queue.length > 0) {
      let vertex = queue[0];
      let rest = [];
      for (let index = 1; index < queue.length; index++) {
        rest.push(queue[index]);
      }
      queue = rest;
      order.push(vertex);
      let neighbours = this.adjacency[vertex];
      for (let index = 0; index < neighbours.length; index++) {
        let next = neighbours[index];
        this.degree[next]--;
        if (this.degree[next] === 0) {
          queue.push(next);
        }
      }
    }
    return order;
  }
}

let sorter = new TopologicalSort();
sorter.addEdge("prep", "cook");
sorter.addEdge("prep", "wash");
sorter.addEdge("wash", "serve");
sorter.addEdge("cook", "serve");
sorter.addEdge("serve", "plate");
console.log("degrees", sorter.degree);
let order = sorter.sort();
console.log("order", order);
