import { ModulePage } from "@/components/project-shell/module-page";

export default function FeasibilityPage({ params }: { params: Promise<{ id: string }> }) {
  return <ModulePage module="feasibility" params={params} />;
}

