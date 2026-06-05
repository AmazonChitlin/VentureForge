import { BuilderIcon } from "@/components/guided-builder/icons";

export function BusinessCoachMessage({ children }: { children: string }) {
  return (
    <aside className="vf-coach">
      <span>
        <BuilderIcon name="spark" size={19} />
      </span>
      <div>
        <strong>Your coach</strong>
        <p>{children}</p>
      </div>
    </aside>
  );
}
