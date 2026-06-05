import { ModulePage } from "@/components/project-shell/module-page";

export default function RiskPage({ params }: { params: Promise<{ id: string }> }) {
  return <ModulePage module="risk" params={params} />;
}

