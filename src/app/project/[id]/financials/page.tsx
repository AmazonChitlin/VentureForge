import { FinancialsScreen } from "@/components/project-shell/financials-screen";

export default async function FinancialsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FinancialsScreen projectId={id} />;
}

