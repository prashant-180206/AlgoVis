// Graph — depth-first search with an explicit stack.
// DFS dives into one branch before backtracking; the stack mirrors that dive.

class Graph {
  constructor() {
    this.adjacency = {};
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

  dfs(start) {
    let order = [];
    let stack = [start];
    this.visited = {};
    this.visited[start] = true;
    while (stack.length > 0) {
      let vertex = stack.pop();
      order.push(vertex);
      let neighbours = this.adjacency[vertex];
      for (let index = 0; index < neighbours.length; index++) {
        let next = neighbours[index];
        if (this.visited[next] === undefined) {
          this.visited[next] = true;
          stack.push(next);
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
console.log("dfs from A", graph.dfs("A"));
console.log("dfs from E", graph.dfs("E"));
