import { AuthNavigation } from "@/components/auth/auth-navigation";
import { requireCurrentUser } from "@/lib/auth/getCurrentUser";

export default async function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCurrentUser("/dashboard");
  return (
    <>
      <AuthNavigation />
      {children}
    </>
  );
}
