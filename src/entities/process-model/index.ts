// Публичный API сущности «process-model».
export * from "./model/types"
export {
  MODEL_VERSION,
  DEFAULT_OPERATION_PARAMS,
  DEFAULT_SOURCE_PARAMS,
  defaultParams,
  emptyModel,
  NODE_LABELS,
  SAMPLE_MODEL,
} from "./model/defaults"
export { useProcessStore } from "./model/store"
export {
  resolveOutgoing,
  outgoingProbabilitySum,
  type ResolvedRoute,
} from "./lib/routing"
export {
  validateModel,
  type ValidationIssue,
  type ValidationReport,
  type IssueLevel,
} from "./lib/validator"
export { serialize, parse, type ParseResult } from "./lib/serializer"
export {
  toFlow,
  toFlowNodes,
  toFlowEdges,
  type FlowNode,
  type FlowEdge,
  type FlowNodeData,
  type FlowEdgeData,
} from "./lib/flow-adapter"
