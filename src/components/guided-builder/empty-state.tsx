import type { ReactNode } from "react";

import { BuilderIcon } from "@/components/guided-builder/icons";

export function FriendlyEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="vf-empty-state">
      <BuilderIcon name="lightbulb" size={22} />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        {action}
      </div>
    </section>
  );
}
