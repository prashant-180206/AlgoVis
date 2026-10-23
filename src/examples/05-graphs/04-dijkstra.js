// Dijkstra — shortest paths from a source, O(V^2) with plain arrays.
// Distances shrink as better edges relax them; visited vertices hydrate first.

class Graph {
  constructor() {
    this.adjacency = {};
    this.vertexes = [];
  }

  addVertex(name) {
    this.adjacency[name] = [];
    this.vertexes.push(name);
    return name;
  }

  addEdge(a, b, weight) {
    this.adjacency[a].push([b, weight]);
    this.adjacency[b].push([a, weight]);
    return weight;
  }

  shortestDistances(source) {
    let distances = {};
    let visited = {};
    for (let index = 0; index < this.vertexes.length; index++) {
      let vertex = this.vertexes[index];
      distances[vertex] = -1;
      visited[vertex] = false;
    }
    distances[source] = 0;
    for (let round = 0; round < this.vertexes.length; round++) {
      let best = null;
      let bestDistance = -1;
      for (let index = 0; index < this.vertexes.length; index++) {
        let vertex = this.vertexes[index];
        if (visited[vertex] === true) {
          continue;
        }
        if (distances[vertex] === -1) {
          continue;
        }
        if (best === null || distances[vertex] < bestDistance) {
          best = vertex;
          bestDistance = distances[vertex];
        }
      }
      if (best === null) {
        break;
      }
      visited[best] = true;
      let neighbours = this.adjacency[best];
      for (let index = 0; index < neighbours.length; index++) {
        let edge = neighbours[index];
        let candidate = bestDistance + edge[1];
        if (distances[edge[0]] === -1 || candidate < distances[edge[0]]) {
          distances[edge[0]] = candidate;
        }
      }
    }
    return distances;
  }
}

let graph = new Graph();
graph.addVertex("A");
graph.addVertex("B");
graph.addVertex("C");
graph.addVertex("D");
graph.addVertex("E");
graph.addEdge("A", "B", 4);
graph.addEdge("A", "C", 1);
graph.addEdge("C", "B", 2);
graph.addEdge("B", "D", 5);
graph.addEdge("C", "D", 8);
graph.addEdge("D", "E", 3);
graph.addEdge("C", "E", 12);
let distances = graph.shortestDistances("A");
console.log("from A to A", distances.A);
console.log("from A to B", distances.B);
console.log("from A to D", distances.D);
console.log("from A to E", distances.E);
