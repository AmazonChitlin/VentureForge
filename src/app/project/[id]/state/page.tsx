import { ModulePage } from "@/components/project-shell/module-page";

export default function StatePage({ params }: { params: Promise<{ id: string }> }) {
  return <ModulePage module="state" params={params} />;
}

