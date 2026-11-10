/**
 * @file include/SovereignUnionFindQubits.ts
 * @version 26.1.0 (Delfosse-Nickerson Union-Find Topological Surface Code Decoder)
 * @description Real O(n alpha(n)) Disjoint-Set (path compression + union by rank) cluster growth
 * and spanning-tree peeling decoder over a d x d rotated planar surface code lattice.
 */

export interface PauliCorrectionEdge {
  u: number;
  v: number;
  pauliOp: 'Z' | 'X';
}

export interface SurfaceCodeDecodeReport {
  codeDistance: number;
  totalStabilizerVertices: number;
  initialAnyonDefects: number;
  clustersMerged: number;
  correctionEdges: PauliCorrectionEdge[];
  residualDefectsAfterPeeling: number;
  logicalChannelFidelity: boolean;
  executionLatencyUs: number;
}

export class SovereignUnionFindQubits {
  private parent: Int32Array;
  private rank: Uint8Array;
  private parity: Uint8Array;
  private touchesBoundary: Uint8Array;

  constructor(numVertices: number, defectVertices: number[], boundaryVertices: Set<number>) {
    this.parent = new Int32Array(numVertices);
    this.rank = new Uint8Array(numVertices);
    this.parity = new Uint8Array(numVertices);
    this.touchesBoundary = new Uint8Array(numVertices);

    for (let i = 0; i < numVertices; i++) {
      this.parent[i] = i;
      this.rank[i] = 0;
      this.parity[i] = 0;
      this.touchesBoundary[i] = boundaryVertices.has(i) ? 1 : 0;
    }

    for (const v of defectVertices) {
      if (v >= 0 && v < numVertices) {
        this.parity[v] ^= 1;
      }
    }
  }

  public find(x: number): number {
    let root = x;
    while (root !== this.parent[root]) {
      root = this.parent[root];
    }
    let curr = x;
    while (curr !== root) {
      const nxt = this.parent[curr];
      this.parent[curr] = root;
      curr = nxt;
    }
    return root;
  }

  public union(x: number, y: number): boolean {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx === ry) return false;

    if (this.rank[rx] < this.rank[ry]) {
      this.parent[rx] = ry;
      this.parity[ry] ^= this.parity[rx];
      this.touchesBoundary[ry] |= this.touchesBoundary[rx];
    } else if (this.rank[rx] > this.rank[ry]) {
      this.parent[ry] = rx;
      this.parity[rx] ^= this.parity[ry];
      this.touchesBoundary[rx] |= this.touchesBoundary[ry];
    } else {
      this.parent[ry] = rx;
      this.rank[rx]++;
      this.parity[rx] ^= this.parity[ry];
      this.touchesBoundary[rx] |= this.touchesBoundary[ry];
    }
    return true;
  }

  public isClusterActive(v: number): boolean {
    const r = this.find(v);
    return this.parity[r] === 1 && this.touchesBoundary[r] === 0;
  }

  /**
   * Executes the Delfosse-Nickerson Union-Find Cluster Growth + Spanning-Tree Peeling Decoder
   * on a d x d planar surface code lattice.
   */
  public static decodePlanarSurfaceCode(
    distance: number = 9,
    injectedErrorEdges: Array<[number, number]> = [
      [12, 13],
      [13, 22],
      [40, 41],
      [58, 67],
    ]
  ): SurfaceCodeDecodeReport {
    const t0 = process.hrtime.bigint();
    const V = distance * distance;
    const adj: number[][] = Array.from({ length: V }, () => []);

    for (let r = 0; r < distance; r++) {
      for (let c = 0; c < distance; c++) {
        const u = r * distance + c;
        if (c + 1 < distance) {
          const v = r * distance + (c + 1);
          adj[u].push(v);
          adj[v].push(u);
        }
        if (r + 1 < distance) {
          const v = (r + 1) * distance + c;
          adj[u].push(v);
          adj[v].push(u);
        }
      }
    }

    // Compute stabilizer syndrome vertices from injected Pauli error edges
    const syndrome = new Uint8Array(V);
    for (const [u, v] of injectedErrorEdges) {
      if (u < V && v < V) {
        syndrome[u] ^= 1;
        syndrome[v] ^= 1;
      }
    }

    const defectVertices: number[] = [];
    for (let i = 0; i < V; i++) {
      if (syndrome[i] === 1) defectVertices.push(i);
    }

    const boundaryVertices = new Set<number>();
    for (let i = 0; i < distance; i++) {
      boundaryVertices.add(i); // Top open boundary
      boundaryVertices.add((distance - 1) * distance + i); // Bottom open boundary
    }

    const uf = new SovereignUnionFindQubits(V, defectVertices, boundaryVertices);
    const erasedEdges = new Set<string>();
    const edgeKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

    let clustersMerged = 0;
    let hasActiveCluster = true;

    // Phase 1: Iterative Cluster Growth until all clusters have even parity or touch open boundary
    while (hasActiveCluster) {
      hasActiveCluster = false;
      const activeVertices: number[] = [];
      for (let v = 0; v < V; v++) {
        if (uf.isClusterActive(v)) {
          activeVertices.push(v);
          hasActiveCluster = true;
        }
      }
      if (!hasActiveCluster) break;

      for (const u of activeVertices) {
        for (const v of adj[u]) {
          const k = edgeKey(u, v);
          if (!erasedEdges.has(k)) {
            erasedEdges.add(k);
            if (uf.union(u, v)) {
              clustersMerged++;
            }
          }
        }
      }
    }

    // Phase 2: Build Spanning Forest over grown erasure clusters and peel leaves bottom-up
    const treeAdj: number[][] = Array.from({ length: V }, () => []);
    const treeParent = new Int32Array(V).fill(-1);
    const visited = new Uint8Array(V);
    const postOrder: number[] = [];

    for (let start = 0; start < V; start++) {
      if (visited[start]) continue;
      const r = uf.find(start);
      // Root spanning tree at a boundary vertex if cluster touches boundary
      let rootNode = start;
      if (uf.touchesBoundary[r]) {
        for (let cand = 0; cand < V; cand++) {
          if (uf.find(cand) === r && boundaryVertices.has(cand)) {
            rootNode = cand;
            break;
          }
        }
      }

      const queue: number[] = [rootNode];
      visited[rootNode] = 1;
      while (queue.length > 0) {
        const curr = queue.shift()!;
        postOrder.push(curr);
        for (const nb of adj[curr]) {
          if (!visited[nb] && erasedEdges.has(edgeKey(curr, nb))) {
            visited[nb] = 1;
            treeParent[nb] = curr;
            treeAdj[curr].push(nb);
            queue.push(nb);
          }
        }
      }
    }

    // Peel from leaves to roots
    const correctionEdges: PauliCorrectionEdge[] = [];
    for (let i = postOrder.length - 1; i >= 0; i--) {
      const u = postOrder[i];
      const p = treeParent[u];
      if (p !== -1 && syndrome[u] === 1) {
        correctionEdges.push({ u, v: p, pauliOp: 'Z' });
        syndrome[u] ^= 1;
        syndrome[p] ^= 1;
      }
    }

    let residualDefects = 0;
    for (let v = 0; v < V; v++) {
      if (syndrome[v] === 1 && !boundaryVertices.has(v)) {
        residualDefects++;
      }
    }

    const latencyUs = Number(process.hrtime.bigint() - t0) / 1000;
    return {
      codeDistance: distance,
      totalStabilizerVertices: V,
      initialAnyonDefects: defectVertices.length,
      clustersMerged,
      correctionEdges,
      residualDefectsAfterPeeling: residualDefects,
      logicalChannelFidelity: residualDefects === 0,
      executionLatencyUs: Number(latencyUs.toFixed(2)),
    };
  }
}
