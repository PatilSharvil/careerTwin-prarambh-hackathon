import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge } from '../ui/Badge';
import type { GraphNode, GraphEdge, SkillStatus, Phase } from '../../types/api';
import { CheckCircle2, Lock, PlayCircle, Unlock, Milestone } from 'lucide-react';

export interface CustomNodeData {
  label: string;
  status: SkillStatus;
  phase: Phase;
  skillId: string;
  [key: string]: unknown;
}

const SkillNodeComponent: React.FC<NodeProps<Node<CustomNodeData>>> = ({ data }) => {
  const { label, status, phase, skillId } = data;

  const getStatusIcon = (st: SkillStatus) => {
    switch (st) {
      case 'done':
        return <CheckCircle2 className="w-3.5 h-3.5 text-black stroke-[3]" />;
      case 'in_progress':
        return <PlayCircle className="w-3.5 h-3.5 text-black stroke-[2.5] animate-pulse" />;
      case 'available':
        return <Unlock className="w-3.5 h-3.5 text-black stroke-[2.5]" />;
      case 'locked':
        return <Lock className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getStatusBorder = (st: SkillStatus) => {
    switch (st) {
      case 'done':
        return 'border-2 border-black bg-[#79e7a8] text-black shadow-neo';
      case 'in_progress':
        return 'border-2 border-black bg-[#ffe566] text-black shadow-neo';
      case 'available':
        return 'border-2 border-black bg-white text-black shadow-neo hover:bg-[#faf6ee]';
      case 'locked':
        return 'border-2 border-black bg-slate-100 text-slate-600 opacity-85 shadow-neo-xs';
    }
  };

  const isCapstone = skillId === 'capstone';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${label} milestone, status: ${status.replace('_', ' ')}, phase: ${phase}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          (e.currentTarget as HTMLElement).click();
        }
      }}
      className={`px-4 py-3 rounded-2xl border-2 min-w-[200px] max-w-[240px] cursor-pointer transition-all hover:scale-105 focus-visible:outline-none ${getStatusBorder(
        status
      )}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-black !border-2 !border-white"
      />

      <div className="flex items-start justify-between gap-1.5 mb-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-black font-mono bg-white/70 px-1.5 py-0.5 rounded border border-black shadow-neo-xs">
          {phase}
        </span>
        <Badge status={status} size="sm" className="flex items-center gap-1 capitalize">
          {getStatusIcon(status)}
          {status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="flex items-center gap-1.5 mt-1">
        {isCapstone && <Milestone className="w-4 h-4 text-black stroke-[2.5] flex-shrink-0" />}
        <h4 className="text-xs font-black leading-snug break-words text-black">
          {label}
        </h4>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-black !border-2 !border-white"
      />
    </div>
  );
};

const nodeTypes = {
  skillNode: SkillNodeComponent,
};

export interface RoadmapGraphViewProps {
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  onSelectNode: (nodeId: string) => void;
}

export const RoadmapGraphView: React.FC<RoadmapGraphViewProps> = ({
  graph,
  onSelectNode,
}) => {
  // Compute layered left-to-right topological layout from edges
  const { flowNodes, flowEdges } = useMemo(() => {
    const { nodes, edges } = graph;

    // Phase base layer mapping
    const phaseOrder: Record<Phase, number> = {
      Foundation: 0,
      Core: 1,
      Applied: 2,
      Capstone: 3,
    };

    // Calculate in-degree and predecessors
    const predecessors = new Map<string, string[]>();
    nodes.forEach((n) => predecessors.set(n.id, []));
    edges.forEach((e) => {
      if (predecessors.has(e.target)) {
        predecessors.get(e.target)!.push(e.source);
      }
    });

    // Compute layer for each node (longest prerequisite path + phase constraint)
    const layers = new Map<string, number>();

    // Initialize with phase minimum
    nodes.forEach((n) => {
      layers.set(n.id, phaseOrder[n.phase] ?? 0);
    });

    // Relax layers based on edge dependencies
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 10) {
      changed = false;
      iterations++;
      edges.forEach((e) => {
        const srcLayer = layers.get(e.source) ?? 0;
        const tgtLayer = layers.get(e.target) ?? 0;
        if (tgtLayer <= srcLayer) {
          layers.set(e.target, srcLayer + 1);
          changed = true;
        }
      });
    }

    // Group nodes by layer
    const layerGroups = new Map<number, GraphNode[]>();
    nodes.forEach((n) => {
      const l = layers.get(n.id) ?? 0;
      if (!layerGroups.has(l)) layerGroups.set(l, []);
      layerGroups.get(l)!.push(n);
    });

    // Generate positions: x = layer * 280, y = index * 120
    const computedNodes: Node<CustomNodeData>[] = [];
    layerGroups.forEach((groupNodes, layerIdx) => {
      const totalInLayer = groupNodes.length;
      groupNodes.forEach((node, indexInLayer) => {
        // Center nodes vertically per layer
        const x = layerIdx * 300 + 40;
        const y = (indexInLayer - (totalInLayer - 1) / 2) * 140 + 200;

        computedNodes.push({
          id: node.id,
          type: 'skillNode',
          position: { x, y },
          data: {
            label: node.label,
            status: node.status,
            phase: node.phase,
            skillId: node.id,
          },
        });
      });
    });

    // Map edges to React Flow edges with smooth styling
    const computedEdges: Edge[] = edges.map((e) => ({
      id: `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
    }));

    return { flowNodes: computedNodes, flowEdges: computedEdges };
  }, [graph]);

  return (
    <div
      role="region"
      aria-label="Interactive skill dependency graph"
      className="w-full h-[600px] bg-[#faf6ee] rounded-3xl border-2 border-black overflow-hidden relative shadow-neo-lg"
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Background color="#000000" gap={24} size={1.5} />
        <Controls showInteractive={false} className="!bg-white !shadow-neo !border-2 !border-black !rounded-xl" />
      </ReactFlow>
    </div>
  );
};
