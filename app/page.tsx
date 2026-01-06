export default function HomePage() {
  // Dashboard listing (Phase-1 UI)
  // Editor lives under /workflows/[id] and /workflows/new
  const WorkflowListClient = require("./components/workflows/WorkflowListClient").default;
  return <WorkflowListClient />;
}
