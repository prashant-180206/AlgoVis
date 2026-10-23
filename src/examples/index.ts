/**
 * Ready-made AlgoVis example programs, organized folder-wise by concept.
 *
 * Each example is a real `.js` file next to this module, bundled as a raw
 * string with Vite's `?raw` import — the same source is shown in the editor,
 * so there are no duplicated string copies. The desktop app materializes every
 * file (names may contain `/`, e.g. "04-trees/02-min-heap.js") into the app's
 * AppData `examples` folder and opens that folder as the default workspace, so
 * every app user starts with a browsable, editable example library. Files that
 * already exist on disk are left untouched, so user edits survive updates.
 */

export interface ExampleScript {
  /** Path inside the examples folder. Numbered prefixes keep the tree sorted. */
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly source: string;
}

import bubbleSort from "./01-arrays-and-sorting/01-bubble-sort.js?raw";
import insertionSort from "./01-arrays-and-sorting/02-insertion-sort.js?raw";
import quickSort from "./01-arrays-and-sorting/03-quick-sort.js?raw";
import twoSum from "./01-arrays-and-sorting/04-two-sum.js?raw";
import stackQueueStack from "./02-stacks-and-queues/01-stack.js?raw";
import stackQueueQueue from "./02-stacks-and-queues/02-queue.js?raw";
import monotonicStack from "./02-stacks-and-queues/03-monotonic-stack.js?raw";
import circularQueue from "./02-stacks-and-queues/04-circular-queue.js?raw";
import doublyLinkedList from "./03-linked-lists/01-doubly-linked-list.js?raw";
import singlyLinkedList from "./03-linked-lists/02-singly-linked-list.js?raw";
import cycleDetection from "./03-linked-lists/03-cycle-detection.js?raw";
import binarySearchTree from "./04-trees/01-binary-search-tree.js?raw";
import minHeap from "./04-trees/02-min-heap.js?raw";
import treap from "./04-trees/03-treap.js?raw";
import segmentTree from "./04-trees/04-segment-tree.js?raw";
import treeTraversals from "./04-trees/05-tree-traversals.js?raw";
import trie from "./04-trees/06-trie.js?raw";
import graphBfs from "./05-graphs/01-graph-bfs.js?raw";
import graphDfs from "./05-graphs/02-graph-dfs.js?raw";
import topologicalSort from "./05-graphs/03-topological-sort.js?raw";
import dijkstra from "./05-graphs/04-dijkstra.js?raw";
import unionFind from "./05-graphs/05-union-find.js?raw";
import fibonacciDp from "./06-dynamic-programming/01-fibonacci-dp.js?raw";
import knapsackDp from "./06-dynamic-programming/02-knapsack-dp.js?raw";
import lisDp from "./06-dynamic-programming/03-lis-dp.js?raw";
import coinChange from "./06-dynamic-programming/04-coin-change.js?raw";
import nQueens from "./07-backtracking/01-n-queens.js?raw";
import permutationsCombinations from "./07-backtracking/02-permutations-combinations.js?raw";
import subsetSum from "./07-backtracking/03-subset-sum.js?raw";
import matrixOperations from "./08-math-matrix-vector/01-matrix-operations.js?raw";
import vector2dOperations from "./08-math-matrix-vector/02-2d-vector-operations.js?raw";

export const exampleScripts: readonly ExampleScript[] = [
  {
    name: "01-arrays-and-sorting/01-bubble-sort.js",
    title: "Arrays & sorting — Bubble sort",
    description:
      "Classic O(n^2) comparison sort; watch neighbouring tiles swap until settled.",
    source: bubbleSort,
  },
  {
    name: "01-arrays-and-sorting/02-insertion-sort.js",
    title: "Arrays & sorting — Insertion sort",
    description: "Builds a sorted prefix one shift at a time.",
    source: insertionSort,
  },
  {
    name: "01-arrays-and-sorting/03-quick-sort.js",
    title: "Arrays & sorting — Quick sort",
    description:
      "In-place quicksort with a real recursion chain of partition frames.",
    source: quickSort,
  },
  {
    name: "01-arrays-and-sorting/04-two-sum.js",
    title: "Arrays & sorting — Two sum",
    description: "Single-pass hash-map lookup for a pair matching the target.",
    source: twoSum,
  },
  {
    name: "02-stacks-and-queues/01-stack.js",
    title: "Stacks & queues — Stack",
    description: "LIFO discipline; the card renders a TOP marker.",
    source: stackQueueStack,
  },
  {
    name: "02-stacks-and-queues/02-queue.js",
    title: "Stacks & queues — Queue",
    description: "FIFO discipline with a moving FRONT index.",
    source: stackQueueQueue,
  },
  {
    name: "02-stacks-and-queues/03-monotonic-stack.js",
    title: "Stacks & queues — Monotonic stack",
    description: "Stock span problem; pop weaker days to accumulate spans.",
    source: monotonicStack,
  },
  {
    name: "02-stacks-and-queues/04-circular-queue.js",
    title: "Stacks & queues — Circular queue",
    description: "Fixed ring buffer with wrap-around front and back.",
    source: circularQueue,
  },
  {
    name: "03-linked-lists/01-doubly-linked-list.js",
    title: "Linked lists — Doubly linked list",
    description: "Nodes with prev and next links, head and tail pointers.",
    source: doublyLinkedList,
  },
  {
    name: "03-linked-lists/02-singly-linked-list.js",
    title: "Linked lists — Singly linked list",
    description: "Head-to-tail chain with O(1) append and prepend.",
    source: singlyLinkedList,
  },
  {
    name: "03-linked-lists/03-cycle-detection.js",
    title: "Linked lists — Cycle detection",
    description: "Floyd's tortoise and hare chasing through a looped chain.",
    source: cycleDetection,
  },
  {
    name: "04-trees/01-binary-search-tree.js",
    title: "Trees — Binary search tree",
    description: "Iterative inserts; smaller values go left, larger right.",
    source: binarySearchTree,
  },
  {
    name: "04-trees/02-min-heap.js",
    title: "Trees — Min heap",
    description: "Sift-up insertion over a flat array, drawn as a tree.",
    source: minHeap,
  },
  {
    name: "04-trees/03-treap.js",
    title: "Trees — Treap",
    description: "Randomized BST: nodes rotate whenever a priority wins.",
    source: treap,
  },
  {
    name: "04-trees/04-segment-tree.js",
    title: "Trees — Segment tree",
    description: "Sum tree over an array with recursive range queries.",
    source: segmentTree,
  },
  {
    name: "04-trees/05-tree-traversals.js",
    title: "Trees — Tree traversals",
    description: "Preorder, inorder and postorder visits in one class.",
    source: treeTraversals,
  },
  {
    name: "04-trees/06-trie.js",
    title: "Trees — Trie",
    description: "Prefix tree over words, children keyed by character.",
    source: trie,
  },
  {
    name: "05-graphs/01-graph-bfs.js",
    title: "Graphs — Breadth-first search",
    description: "Level-by-level exploration; the queue holds the frontier.",
    source: graphBfs,
  },
  {
    name: "05-graphs/02-graph-dfs.js",
    title: "Graphs — Depth-first search",
    description: "Explicit-stack DFS diving into each branch first.",
    source: graphDfs,
  },
  {
    name: "05-graphs/03-topological-sort.js",
    title: "Graphs — Topological sort",
    description: "Kahn's algorithm releasing zero-in-degree vertices.",
    source: topologicalSort,
  },
  {
    name: "05-graphs/04-dijkstra.js",
    title: "Graphs — Dijkstra",
    description: "Shortest paths with plain arrays and edge relaxation.",
    source: dijkstra,
  },
  {
    name: "05-graphs/05-union-find.js",
    title: "Graphs — Union-Find",
    description: "Disjoint sets with path compression and rank merging.",
    source: unionFind,
  },
  {
    name: "06-dynamic-programming/01-fibonacci-dp.js",
    title: "Dynamic programming — Fibonacci",
    description: "Naive recursion vs memoized vs bottom-up table.",
    source: fibonacciDp,
  },
  {
    name: "06-dynamic-programming/02-knapsack-dp.js",
    title: "Dynamic programming — 0/1 knapsack",
    description: "Rolling 1D best array swept backwards per item.",
    source: knapsackDp,
  },
  {
    name: "06-dynamic-programming/03-lis-dp.js",
    title: "Dynamic programming — Longest increasing subsequence",
    description: "O(n^2) DP with a parent chain to rebuild the sequence.",
    source: lisDp,
  },
  {
    name: "06-dynamic-programming/04-coin-change.js",
    title: "Dynamic programming — Coin change",
    description: "Fewest coins per amount, with reconstruction of the change.",
    source: coinChange,
  },
  {
    name: "07-backtracking/01-n-queens.js",
    title: "Backtracking — N-Queens",
    description: "Column-per-row board; call frames push and pop while backtracking.",
    source: nQueens,
  },
  {
    name: "07-backtracking/02-permutations-combinations.js",
    title: "Backtracking — Permutations & combinations",
    description: "Recursive generation counting P(n) and nCk.",
    source: permutationsCombinations,
  },
  {
    name: "07-backtracking/03-subset-sum.js",
    title: "Backtracking — Subset sum",
    description: "Take-or-skip search that prunes when the total overshoots.",
    source: subsetSum,
  },
  {
    name: "08-math-matrix-vector/01-matrix-operations.js",
    title: "Math — Matrix operations",
    description: "Add, transpose, multiply and a 2x2 determinant on row arrays.",
    source: matrixOperations,
  },
  {
    name: "08-math-matrix-vector/02-2d-vector-operations.js",
    title: "Math — 2D vector operations",
    description: "A Vec2 class with add, scale, dot, cross and normalize.",
    source: vector2dOperations,
  },
];

export function exampleFiles(): Array<{ name: string; contents: string }> {
  return exampleScripts.map((script) => ({
    name: script.name,
    contents: script.source,
  }));
}
