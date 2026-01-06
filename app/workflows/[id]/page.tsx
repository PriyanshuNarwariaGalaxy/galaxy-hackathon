import WorkflowEditorClient from "../WorkflowEditorClient";

export default async function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkflowEditorClient workflowId={id} />;
}

