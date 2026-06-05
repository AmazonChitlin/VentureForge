import { BuilderIcon, type BuilderIconName } from "@/components/guided-builder/icons";
import type { GuidedChoice } from "@/engine/guided-builder/schema";

export function SmartChoiceCards({
  choices,
  value,
  onChange,
}: {
  choices: GuidedChoice[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="vf-choice-grid">
      {choices.map((choice) => (
        <button
          aria-pressed={choice.value === value}
          className={choice.value === value ? "is-selected" : ""}
          key={choice.value}
          onClick={() => onChange(choice.value)}
          type="button"
        >
          <BuilderIcon name={choice.icon as BuilderIconName} size={20} />
          <strong>{choice.label}</strong>
          <span>{choice.description}</span>
        </button>
      ))}
    </div>
  );
}
