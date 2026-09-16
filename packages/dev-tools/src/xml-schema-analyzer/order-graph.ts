export type CompareFn<K> = (result: readonly K[], a: K, b: K) => number;

export class OrderGraph<K> {
  private edges = new Map<K, Map<K, number>>();
  private nodes = new Set<K>();

  addEdge(a: K, b: K, weight = 1): void {
    let map = this.edges.get(a);
    if (!map) {
      map = new Map();
      this.edges.set(a, map);
    }
    map.set(b, (map.get(b) ?? 0) + weight);
  }

  addSequence(seq: readonly K[]): void {
    for (let i = 0; i + 1 < seq.length; i++) {
      this.addEdge(seq[i]!, seq[i + 1]!);
    }
    for (const node of seq) {
      this.nodes.add(node);
    }
  }

  merge(other: OrderGraph<K>): void {
    for (const [a, edges] of other.edges) {
      for (const [b, w] of edges) {
        this.addEdge(a, b, w);
      }
    }
    for (const node of other.nodes) {
      this.nodes.add(node);
    }
  }

  topoSort(compare: CompareFn<K>): K[] {
    const indegree = new Map<K, number>();
    const score = new Map<K, number>();

    for (const node of this.nodes) {
      indegree.set(node, 0);
      score.set(node, 0);
    }

    for (const [from, edges] of this.edges) {
      for (const [to, w] of edges) {
        indegree.set(to, (indegree.get(to) ?? 0) + 1);
        score.set(from, (score.get(from) ?? 0) + w);
        score.set(to, (score.get(to) ?? 0) - w);
      }
    }

    const result: K[] = [];
    const queue: K[] = [];

    while (indegree.size > 0) {
      let hasZero = false;

      for (const [node, deg] of indegree) {
        if (deg === 0) {
          queue.push(node);
          hasZero = true;
        }
      }

      if (!hasZero) {
        let bestScore = -Infinity;
        for (const s of score.values()) bestScore = Math.max(bestScore, s);

        for (const [node, s] of score) {
          if (s === bestScore) queue.push(node);
        }
      }

      while (queue.length) {
        const idx = popBestIndex(queue, (a, b) => compare(result, a, b));
        const node = queue.splice(idx, 1)[0]!;

        result.push(node);
        indegree.delete(node);
        score.delete(node);

        const next = this.edges.get(node);
        if (!next) continue;

        for (const [to, w] of next) {
          if (indegree.has(to)) {
            const d = indegree.get(to)! - 1;
            indegree.set(to, d);
            if (d === 0) queue.push(to);
          }

          if (score.has(to)) {
            score.set(to, score.get(to)! + w);
          }
        }
      }
    }

    return result;
  }
}

function popBestIndex<T>(values: readonly T[], cmp: (a: T, b: T) => number): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (cmp(values[i]!, values[best]!) < 0) {
      best = i;
    }
  }
  return best;
}

function commonPrefixLength(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

export const prefixPriority: CompareFn<string> = (result, a, b) => {
  const prev = result.at(-1);

  const pa = prev ? commonPrefixLength(prev, a) : 0;
  const pb = prev ? commonPrefixLength(prev, b) : 0;

  if (pa !== pb) return pb - pa;
  return a.localeCompare(b);
};
