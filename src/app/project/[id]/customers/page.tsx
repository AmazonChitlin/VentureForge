import { ModulePage } from "@/components/project-shell/module-page";

export default function CustomersPage({ params }: { params: Promise<{ id: string }> }) {
  return <ModulePage module="customers" params={params} />;
}

