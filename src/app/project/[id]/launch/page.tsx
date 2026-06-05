import { ModulePage } from "@/components/project-shell/module-page";

export default function LaunchPage({ params }: { params: Promise<{ id: string }> }) {
  return <ModulePage module="launch" params={params} />;
}

