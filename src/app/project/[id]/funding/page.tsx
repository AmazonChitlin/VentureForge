import { ModulePage } from "@/components/project-shell/module-page";

export default function FundingPage({ params }: { params: Promise<{ id: string }> }) {
  return <ModulePage module="funding" params={params} />;
}

