// Graph — breadth-first search over an adjacency list.
// BFS visits level by level; the queue holds the frontier.

class Graph {
  constructor() {
    this.adjacency = {};
    this.visited = {};
  }

  addEdge(a, b) {
    if (this.adjacency[a] === undefined) {
      this.adjacency[a] = [];
    }
    if (this.adjacency[b] === undefined) {
      this.adjacency[b] = [];
    }
    this.adjacency[a].push(b);
    this.adjacency[b].push(a);
  }

  bfs(start) {
    let order = [];
    let queue = [start];
    this.visited[start] = true;
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
        if (this.visited[next] === undefined) {
          this.visited[next] = true;
          queue.push(next);
        }
      }
    }
    return order;
  }
}

let graph = new Graph();
graph.addEdge("A", "B");
graph.addEdge("A", "C");
graph.addEdge("B", "D");
graph.addEdge("C", "D");
graph.addEdge("D", "E");
let order = graph.bfs("A");
console.log("bfs from A", order);
