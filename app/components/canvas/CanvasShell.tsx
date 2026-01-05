"use client";

import ReactFlow, { Background, BackgroundVariant, Controls, Edge, MiniMap, useEdgesState, useNodesState, Node } from "reactflow";
import Sidebar from "../sidebar/Sidebar";

export default function CanvasShell() {

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);



    return (
        <main
            className="flex flex-1 h-full w-full bg-[#0E0E13]"
            tabIndex={0}
        >
            
            <Sidebar
                name={"Testing Hardcoded"}
                showName={(isVisible) => { }}
            />


            <div className="flex-1 relative h-full">

                <div
                    className="flex-1 h-full w-full"
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                    }}
                >
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        fitView
                        proOptions={{ hideAttribution: true }}
                        className="h-full w-full"
                    >

                        <Background
                            variant={BackgroundVariant.Dots}
                            gap={16}
                            size={1.3}
                            color="#44424A"
                        />
                        <Controls position="bottom-left" />
                        <MiniMap
                            position="bottom-right"
                            maskColor="rgba(0,0,0,0.6)"
                            nodeColor={() => "#1f2937"}
                            className="rounded-lg border border-white/10"
                        />
                    </ReactFlow>
                </div>
            </div>
        </main>
    );
}