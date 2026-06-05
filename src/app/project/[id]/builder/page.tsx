import { GuidedBuilderApp } from "@/components/guided-builder/guided-builder-app";

export default async function BusinessBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GuidedBuilderApp projectId={id} />;
}
