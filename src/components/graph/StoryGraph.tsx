"use client";

import {
  Background,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo } from "react";
import type { GraphAuthor, GraphNode } from "@/lib/game/graph";
import { StoryNode, type StoryNodeData } from "./StoryNode";
import { layoutTree } from "./layout";

const nodeTypes = { story: StoryNode };

export function StoryGraph({
  nodes,
  onSelect,
  selectedNodeId,
}: {
  nodes: GraphNode[];
  authors: GraphAuthor[];
  onSelect?: (n: GraphNode) => void;
  selectedNodeId?: string | null;
}) {
  return (
    <ReactFlowProvider>
      <InnerGraph
        nodes={nodes}
        onSelect={onSelect}
        selectedNodeId={selectedNodeId}
      />
    </ReactFlowProvider>
  );
}

function InnerGraph({
  nodes,
  onSelect,
  selectedNodeId,
}: {
  nodes: GraphNode[];
  onSelect?: (n: GraphNode) => void;
  selectedNodeId?: string | null;
}) {
  const flow = useReactFlow();

  const { rfNodes, rfEdges } = useMemo(() => {
    const positions = layoutTree(
      nodes.map((n) => ({ id: n.id, parentId: n.parentId })),
      { xGap: 240, yGap: 170 }
    );
    const rfNodes: Node<StoryNodeData>[] = nodes.map((n) => {
      const pos = positions.get(n.id) ?? { x: 0, y: 0 };
      return {
        id: n.id,
        type: "story",
        position: pos,
        data: {
          authorName: n.authorName,
          authorHue: n.authorHue,
          isYou: n.isYou,
          isCurrent: n.isCurrent,
          isRoot: n.isRoot,
          location: n.location,
          sceneSnippet: n.sceneSnippet,
          chosenAction: n.chosenAction,
        },
        selected: selectedNodeId === n.id,
      };
    });
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const rfEdges: Edge[] = nodes
      .filter((n) => n.parentId && byId.has(n.parentId))
      .map((n) => {
        const child = byId.get(n.id)!;
        const childHue = child.authorHue;
        const parent = byId.get(n.parentId!)!;
        const isFork = parent.authorUserId !== child.authorUserId;
        return {
          id: `e-${n.parentId}-${n.id}`,
          source: n.parentId!,
          target: n.id,
          type: "smoothstep",
          animated: child.isCurrent,
          style: {
            stroke: `hsla(${childHue}, 90%, 65%, ${isFork ? 0.95 : 0.55})`,
            strokeWidth: isFork ? 2.5 : 1.5,
            strokeDasharray: isFork ? "6 3" : undefined,
          },
        };
      });
    return { rfNodes, rfEdges };
  }, [nodes, selectedNodeId]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      flow.fitView({ padding: 0.2, duration: 400 });
    }, 100);
    return () => window.clearTimeout(id);
  }, [flow, rfNodes.length]);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, n) => {
        const original = nodes.find((x) => x.id === n.id);
        if (original) onSelect?.(original);
      }}
      proOptions={{ hideAttribution: true }}
      fitView
      minZoom={0.2}
      maxZoom={2}
      colorMode="dark"
    >
      <Background gap={28} size={1} color="var(--border)" />
      <Controls
        className="!bg-[var(--surface)] !border !border-[var(--border)] [&_button]:!bg-transparent [&_button]:!border-0 [&_button]:!text-[var(--foreground)]"
      />
      <MiniMap
        pannable
        zoomable
        className="!bg-[var(--surface)] !border !border-[var(--border)]"
        maskColor="rgba(11,11,16,0.6)"
        nodeColor={(n) => {
          const d = (n.data ?? {}) as StoryNodeData;
          return `hsla(${d.authorHue ?? 50}, 80%, 60%, 0.6)`;
        }}
      />
    </ReactFlow>
  );
}
