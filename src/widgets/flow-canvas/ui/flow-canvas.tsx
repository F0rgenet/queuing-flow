import { useCallback, useMemo, type DragEvent } from "react"
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react"
import { useProcessStore, type NodeType } from "@/entities/process-model"
import { useSimulationStore } from "@/features/simulation"
import { DND_NODE_MIME } from "@/shared/config/dnd"
import { nodeTypes, edgeTypes } from "../lib/registry"

function CanvasInner() {
  const nodes = useProcessStore((s) => s.nodes)
  const edges = useProcessStore((s) => s.edges)
  const selectedNodeId = useProcessStore((s) => s.selectedNodeId)
  const selectedEdgeId = useProcessStore((s) => s.selectedEdgeId)
  const activeEdges = useSimulationStore((s) => s.activeEdges)

  const updateNodePosition = useProcessStore((s) => s.updateNodePosition)
  const removeNode = useProcessStore((s) => s.removeNode)
  const removeEdge = useProcessStore((s) => s.removeEdge)
  const addEdge = useProcessStore((s) => s.addEdge)
  const addNode = useProcessStore((s) => s.addNode)
  const selectNode = useProcessStore((s) => s.selectNode)
  const selectEdge = useProcessStore((s) => s.selectEdge)

  const { screenToFlowPosition } = useReactFlow()

  const rfNodes = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: { processNode: n },
        selected: n.id === selectedNodeId,
      })),
    [nodes, selectedNodeId]
  )

  const activeSet = useMemo(() => new Set(activeEdges), [activeEdges])
  const rfEdges = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "process",
        data: { processEdge: e },
        animated: activeSet.has(e.id),
        selected: e.id === selectedEdgeId,
      })),
    [edges, activeSet, selectedEdgeId]
  )

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const ch of changes) {
        if (ch.type === "position" && ch.position) updateNodePosition(ch.id, ch.position)
        else if (ch.type === "remove") removeNode(ch.id)
      }
    },
    [updateNodePosition, removeNode]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const ch of changes) {
        if (ch.type === "remove") removeEdge(ch.id)
      }
    },
    [removeEdge]
  )

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source && c.target) addEdge(c.source, c.target)
    },
    [addEdge]
  )

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData(DND_NODE_MIME) as NodeType
      if (!type) return
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      addNode(type, position)
    },
    [addNode, screenToFlowPosition]
  )

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={(_, node) => selectNode(node.id)}
      onEdgeClick={(_, edge) => selectEdge(edge.id)}
      onPaneClick={() => selectNode(null)}
      onDrop={onDrop}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
      }}
      deleteKeyCode={["Delete", "Backspace"]}
      defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed } }}
      fitView
      proOptions={{ hideAttribution: true }}
      className="bg-muted/30"
    >
      <Background gap={16} className="!bg-background" />
      <Controls className="!shadow-md" />
      <MiniMap pannable zoomable className="!bg-card" />
    </ReactFlow>
  )
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  )
}
