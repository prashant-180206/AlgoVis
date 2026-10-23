// Trie — prefix tree over "al", "algo", "alg", "time", "tiny".
// Children live in a per-node object keyed by character.

class TrieNode {
  constructor() {
    this.children = {};
    this.isWord = false;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
    this.words = 0;
  }

  insert(word) {
    let node = this.root;
    for (let index = 0; index < word.length; index++) {
      let character = word[index];
      if (node.children["k" + character] === undefined) {
        node.children["k" + character] = new TrieNode();
      }
      node = node.children["k" + character];
    }
    if (node.isWord === false) {
      node.isWord = true;
      this.words++;
    }
    return this.words;
  }

  search(word) {
    let node = this.root;
    for (let index = 0; index < word.length; index++) {
      let character = word[index];
      if (node.children["k" + character] === undefined) {
        return false;
      }
      node = node.children["k" + character];
    }
    return node.isWord;
  }

  startsWith(prefix) {
    let node = this.root;
    for (let index = 0; index < prefix.length; index++) {
      let character = prefix[index];
      if (node.children["k" + character] === undefined) {
        return false;
      }
      node = node.children["k" + character];
    }
    return true;
  }
}

let trie = new Trie();
trie.insert("al");
trie.insert("algo");
trie.insert("algorithm");
trie.insert("tiny");
trie.insert("time");
console.log("stored words", trie.words);
console.log("search algo", trie.search("algo"));
console.log("search zone", trie.search("zone"));
console.log("startsWith alg", trie.startsWith("alg"));
console.log("startsWith tim", trie.startsWith("tim"));
