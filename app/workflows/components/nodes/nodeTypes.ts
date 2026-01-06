"use client";

import type { NodeTypes } from "reactflow";

import { BaseNode } from "./BaseNode";

/**
 * React Flow nodeTypes map (UI-only).
 * Node types correspond to Phase 1 registry keys, but UI does not import execution logic.
 */
export const nodeTypes: NodeTypes = {
  prompt: BaseNode,
  image: BaseNode,
  llm: BaseNode,
};

