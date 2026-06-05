import { BuilderIcon } from "@/components/guided-builder/icons";

export function FriendlyWarning({
  title = "A quick note",
  children,
}: {
  title?: string;
  children: string;
}) {
  return (
    <aside className="vf-warning">
      <BuilderIcon name="lightbulb" size={19} />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </aside>
  );
}
