"use client";

import WorkflowEditorClient from "./workflow/WorkflowEditorClient";

export default function HomePage() {
    return (
        <main className="flex h-screen bg-[#0E0E13] text-white">
            <div className="flex h-screen w-screen bg-canvas">
                <WorkflowEditorClient />
            </div>
        </main>
    );
}
