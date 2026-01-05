import { create } from "zustand";
import type { Node } from "reactflow";

type FlowStore = {
  addNode: (node: Node) => void;
  /**
   * Register a listener to be called when a node should be added.
   * Returns an unsubscribe function.
   */
  registerAddNode: (fn: (node: Node) => void) => () => void;
};

export const useFlowStore = create<FlowStore>(() => {
  // support multiple listeners to avoid accidental overwrite
  const listeners: Set<(node: Node) => void> = new Set();

  return {
    registerAddNode(fn) {
      listeners.add(fn);
      // return unsubscribe function
      return () => listeners.delete(fn);
    },

    addNode(node) {
      if (!listeners.size) {
        // no listeners registered yet; silently ignore but log for dev
        if (process.env.NODE_ENV !== "production")
          console.warn("flowStore.addNode called with no registered listeners", node);
        return;
      }

      for (const fn of Array.from(listeners)) {
        try {
          fn(node);
        } catch (err) {
          console.error("flowStore listener error", err);
        }
      }
    },
  };
});
