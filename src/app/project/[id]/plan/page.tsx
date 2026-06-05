import { ModulePage } from "@/components/project-shell/module-page";

export default function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  return <ModulePage module="plan" params={params} />;
}

