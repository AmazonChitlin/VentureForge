import { ModulePage } from "@/components/project-shell/module-page";

export default function ExecutionPage({ params }: { params: Promise<{ id: string }> }) {
  return <ModulePage module="execution" params={params} />;
}

