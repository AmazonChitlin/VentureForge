import { ModulePage } from "@/components/project-shell/module-page";

export default function WebsitePage({ params }: { params: Promise<{ id: string }> }) {
  return <ModulePage module="website" params={params} />;
}

