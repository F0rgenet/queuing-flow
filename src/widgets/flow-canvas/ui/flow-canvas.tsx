import { useCallback, useMemo, type DragEvent } from "react"
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react"
import { useProcessStore, type NodeType } from "@/entities/process-model"
import { ChartConnectorsLayer } from "@/widgets/chart-windows"
import { DND_NODE_MIME } from "@/shared/config/dnd"
import { useTheme } from "@/shared/lib/theme"
import { nodeTypes, edgeTypes } from "../lib/registry"

function CanvasInner() {
  const nodes = useProcessStore((s) => s.nodes)
  const edges = useProcessStore((s) => s.edges)
  const charts = useProcessStore((s) => s.charts)
  const selectedNodeId = useProcessStore((s) => s.selectedNodeId)
  const selectedEdgeId = useProcessStore((s) => s.selectedEdgeId)
  const { theme } = useTheme()

  const updateNodePosition = useProcessStore((s) => s.updateNodePosition)
  const removeNode = useProcessStore((s) => s.removeNode)
  const removeEdge = useProcessStore((s) => s.removeEdge)
  const addEdge = useProcessStore((s) => s.addEdge)
  const addNode = useProcessStore((s) => s.addNode)
  const selectNode = useProcessStore((s) => s.selectNode)
  const selectEdge = useProcessStore((s) => s.selectEdge)
  const moveChart = useProcessStore((s) => s.moveChart)
  const closeChart = useProcessStore((s) => s.closeChart)

  const { screenToFlowPosition } = useReactFlow()

  // Узлы графа = узлы процесса + окна графиков (тип `chart`). Окна — равноправные
  // узлы ReactFlow, поэтому пан/зум/перетаскивание работают штатно.
  const rfNodes = useMemo<Node[]>(
    () => [
      ...nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: { processNode: n },
        selected: n.id === selectedNodeId,
      })),
      ...charts.map((c) => ({
        id: c.id,
        type: "chart" as const,
        position: c.position,
        data: { chart: c },
        // окна не участвуют в выделении и не показывают рамку «selected».
        selectable: false,
        // соединять окно ни с чем нельзя.
        connectable: false,
      })),
    ],
    [nodes, charts, selectedNodeId]
  )

  // Дуги — только связи процесса. Соединительные линии «окно ↔ блок» рисует
  // отдельный слой ChartConnectorsLayer внутри ViewportPortal: edge-система
  // React Flow требует совпадающих handle-типов на обоих концах, что не
  // подходит для произвольной пары «чарт ↔ источник/сток/операция».
  const rfEdges = useMemo<Edge[]>(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "process",
        data: { processEdge: e },
        selected: e.id === selectedEdgeId,
      })),
    [edges, selectedEdgeId]
  )

  const chartIdSet = useMemo(() => new Set(charts.map((c) => c.id)), [charts])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const ch of changes) {
        if (ch.type === "position" && ch.position) {
          if (chartIdSet.has(ch.id)) moveChart(ch.id, ch.position)
          else updateNodePosition(ch.id, ch.position)
        } else if (ch.type === "remove") {
          if (chartIdSet.has(ch.id)) closeChart(ch.id)
          else removeNode(ch.id)
        }
      }
    },
    [updateNodePosition, removeNode, moveChart, closeChart, chartIdSet]
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
      onNodeClick={(_, node) => {
        if (chartIdSet.has(node.id)) return
        selectNode(node.id)
      }}
      onEdgeClick={(_, edge) => selectEdge(edge.id)}
      onPaneClick={() => selectNode(null)}
      onDrop={onDrop}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
      }}
      deleteKeyCode={["Delete", "Backspace"]}
      defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed } }}
      colorMode={theme}
      fitView
      proOptions={{ hideAttribution: true }}
      className="bg-muted/30"
    >
      <Background gap={16} />
      <Controls className="!shadow-md" />
      <ChartConnectorsLayer />
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
