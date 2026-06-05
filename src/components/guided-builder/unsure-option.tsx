export function UnsureOption({
  selected,
  onSelect,
}: {
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={selected}
      className={`vf-unsure ${selected ? "is-selected" : ""}`}
      onClick={onSelect}
      type="button"
    >
      I’m not sure yet
    </button>
  );
}
