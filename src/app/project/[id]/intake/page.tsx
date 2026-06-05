import { IntakeScreen } from "@/components/project-shell/intake-screen";

export default async function IntakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IntakeScreen projectId={id} />;
}

