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
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'in_progress':
        return <PlayCircle className="w-3.5 h-3.5 text-violet-600 animate-pulse" />;
      case 'available':
        return <Unlock className="w-3.5 h-3.5 text-blue-600" />;
      case 'locked':
        return <Lock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getStatusBorder = (st: SkillStatus) => {
    switch (st) {
      case 'done':
        return 'border-emerald-500 bg-emerald-50/90 text-emerald-950 shadow-xs';
      case 'in_progress':
        return 'border-violet-500 bg-violet-50/90 text-violet-950 ring-2 ring-violet-400/30 shadow-sm';
      case 'available':
        return 'border-blue-500 bg-white text-slate-900 shadow-xs hover:border-blue-600';
      case 'locked':
        return 'border-slate-300 bg-slate-100 text-slate-500 opacity-85';
    }
  };

  const isCapstone = skillId === 'capstone';

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 min-w-[200px] max-w-[240px] cursor-pointer transition-all hover:scale-105 ${getStatusBorder(
        status
      )}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-slate-400"
      />

      <div className="flex items-start justify-between gap-1.5 mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          {phase}
        </span>
        <Badge status={status} size="sm" className="flex items-center gap-1 capitalize">
          {getStatusIcon(status)}
          {status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="flex items-center gap-1.5 mt-1">
        {isCapstone && <Milestone className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
        <h4 className="text-xs font-bold leading-snug break-words">
          {label}
        </h4>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-slate-400"
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
    <div className="w-full h-[600px] bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden relative shadow-inner">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Background color="#cbd5e1" gap={20} size={1} />
        <Controls showInteractive={false} className="!bg-white !shadow-md !border-slate-200 !rounded-lg" />
      </ReactFlow>
    </div>
  );
};
