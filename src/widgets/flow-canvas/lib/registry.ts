import type { EdgeTypes, NodeTypes } from "@xyflow/react"
import { ChartNode } from "@/widgets/chart-windows"
import { OperationNode, SinkNode, SourceNode } from "../ui/process-nodes"
import { ProcessEdge } from "../ui/process-edge"

/** Регистрация кастомных типов узлов и связей для React Flow. */
export const nodeTypes: NodeTypes = {
  operation: OperationNode,
  source: SourceNode,
  sink: SinkNode,
  chart: ChartNode,
}

export const edgeTypes: EdgeTypes = {
  process: ProcessEdge,
}
