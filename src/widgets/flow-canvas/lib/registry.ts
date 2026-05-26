import type { EdgeTypes, NodeTypes } from "@xyflow/react"
import { OperationNode, SinkNode, SourceNode } from "../ui/process-nodes"
import { ProcessEdge } from "../ui/process-edge"

/** Регистрация кастомных типов узлов и связей для React Flow. */
export const nodeTypes: NodeTypes = {
  operation: OperationNode,
  source: SourceNode,
  sink: SinkNode,
}

export const edgeTypes: EdgeTypes = {
  process: ProcessEdge,
}
