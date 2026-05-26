import type { Edge, Node } from "@xyflow/react"
import type { ProcessEdge, ProcessModel, ProcessNode } from "../model/types"

/** Данные, прокидываемые в кастомный React Flow узел. */
export type FlowNodeData = { processNode: ProcessNode }
export type FlowNode = Node<FlowNodeData>
export type FlowEdgeData = { processEdge: ProcessEdge }
export type FlowEdge = Edge<FlowEdgeData>

export function toFlowNodes(nodes: ProcessNode[]): FlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: { processNode: node },
  }))
}

export function toFlowEdges(edges: ProcessEdge[]): FlowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "process",
    data: { processEdge: edge },
  }))
}

export function toFlow(model: ProcessModel): {
  nodes: FlowNode[]
  edges: FlowEdge[]
} {
  return { nodes: toFlowNodes(model.nodes), edges: toFlowEdges(model.edges) }
}
