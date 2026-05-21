/**
 * Simple deterministic tree-ish layout for our node graph.
 *
 * We bucket nodes by depth (BFS from roots) and then assign x positions per
 * depth so siblings space out evenly. Multi-root and disconnected nodes are
 * supported.
 *
 * Returns positions in React Flow `{ x, y }` coordinates.
 */
export function layoutTree<N extends { id: string; parentId: string | null }>(
  nodes: N[],
  opts: { xGap?: number; yGap?: number } = {}
): Map<string, { x: number; y: number }> {
  const xGap = opts.xGap ?? 240;
  const yGap = opts.yGap ?? 180;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) {
    if (n.parentId && byId.has(n.parentId)) {
      const arr = childrenOf.get(n.parentId) ?? [];
      arr.push(n.id);
      childrenOf.set(n.parentId, arr);
    }
  }

  const roots = nodes
    .filter((n) => !n.parentId || !byId.has(n.parentId))
    .map((n) => n.id);

  // Sort children to keep the layout stable on re-renders.
  for (const arr of childrenOf.values()) arr.sort();

  const positions = new Map<string, { x: number; y: number }>();
  let cursorX = 0;
  for (const r of roots) {
    cursorX = walk(r, 0, cursorX);
  }

  function walk(id: string, depth: number, x: number): number {
    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) {
      positions.set(id, { x: x * xGap, y: depth * yGap });
      return x + 1;
    }
    const start = x;
    let cursor = x;
    for (const k of kids) {
      cursor = walk(k, depth + 1, cursor);
    }
    const center = (start + cursor - 1) / 2;
    positions.set(id, { x: center * xGap, y: depth * yGap });
    return cursor;
  }

  return positions;
}
