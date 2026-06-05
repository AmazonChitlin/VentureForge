import { ModulePage } from "@/components/project-shell/module-page";

export default function ConceptPage({ params }: { params: Promise<{ id: string }> }) {
  return <ModulePage module="concept" params={params} />;
}

