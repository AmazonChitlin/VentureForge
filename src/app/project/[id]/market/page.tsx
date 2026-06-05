import { ModulePage } from "@/components/project-shell/module-page";

export default function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  return <ModulePage module="market" params={params} />;
}

