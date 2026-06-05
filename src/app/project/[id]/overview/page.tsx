import { OverviewScreen } from "@/components/project-shell/overview-screen";

export default async function OverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OverviewScreen projectId={id} />;
}

