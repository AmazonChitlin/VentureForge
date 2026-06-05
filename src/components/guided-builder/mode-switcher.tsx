import { BuilderIcon } from "@/components/guided-builder/icons";
import type { GuidedBuilderMode } from "@/engine/guided-builder/schema";

const modes: { id: GuidedBuilderMode; label: string; icon: "clipboard" | "document" | "user" }[] = [
  { id: "guided", label: "Guided", icon: "clipboard" },
  { id: "review", label: "Review", icon: "document" },
  { id: "pro", label: "Detailed", icon: "user" },
];

export function ModeSwitcher({
  value,
  onChange,
}: {
  value: GuidedBuilderMode;
  onChange: (mode: GuidedBuilderMode) => void;
}) {
  return (
    <div className="vf-mode-switcher" aria-label="Builder mode">
      {modes.map((mode) => (
        <button
          aria-pressed={mode.id === value}
          className={mode.id === value ? "is-active" : ""}
          key={mode.id}
          onClick={() => onChange(mode.id)}
          type="button"
        >
          <BuilderIcon name={mode.icon} size={16} />
          {mode.label}
        </button>
      ))}
    </div>
  );
}
