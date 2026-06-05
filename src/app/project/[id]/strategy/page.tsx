import { ModulePage } from "@/components/project-shell/module-page";

export default function StrategyPage({ params }: { params: Promise<{ id: string }> }) {
  return <ModulePage module="strategy" params={params} />;
}

