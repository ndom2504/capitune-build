import { WorkspaceClient } from "@/components/workspace-client";
import { buildPlaygroundBundle } from "@/lib/demo/bundle";

export default async function DemoPage() {
  const initial = await buildPlaygroundBundle();
  return <WorkspaceClient initial={initial} demoMode playground previewToken="" />;
}
