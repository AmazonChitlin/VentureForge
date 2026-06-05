import { ModulePage } from "@/components/project-shell/module-page";

export default function CompetitorsPage({ params }: { params: Promise<{ id: string }> }) {
  return <ModulePage module="competitors" params={params} />;
}

