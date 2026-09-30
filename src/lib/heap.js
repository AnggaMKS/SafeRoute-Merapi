// Binary min-heap over (key, value) pairs, used as the search priority queue.
export class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }

  push(key, val) {
    const { k, v } = this;
    let i = k.length;
    k.push(key); v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  }

  pop() {
    const { k, v } = this;
    const top = v[0];
    const lastK = k.pop(), lastV = v.pop();
    const n = k.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        let l = 2 * i + 1;
        if (l >= n) break;
        const r = l + 1;
        if (r < n && k[r] < k[l]) l = r;
        if (k[l] >= lastK) break;
        k[i] = k[l]; v[i] = v[l]; i = l;
      }
      k[i] = lastK; v[i] = lastV;
    }
    return top;
  }
}