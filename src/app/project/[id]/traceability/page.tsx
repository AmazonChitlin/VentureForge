import { TraceabilityScreen } from "@/components/project-shell/traceability-screen";

export default async function TraceabilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TraceabilityScreen projectId={id} />;
}
