import { notFound, redirect } from "next/navigation";

import { requireProjectAccess } from "@/lib/auth/requireProjectAccess";

export default async function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireProjectAccess(id);
  if (!access.ok) {
    if (access.status === 401) {
      redirect(`/login?callbackUrl=${encodeURIComponent(`/project/${id}/overview`)}`);
    }
    notFound();
  }

  return children;
}
