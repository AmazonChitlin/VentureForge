export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const level = confidence >= 70 ? "strong" : confidence >= 40 ? "developing" : "early";
  return (
    <span className={`vf-confidence-badge is-${level}`}>
      Draft confidence: {confidence}%
    </span>
  );
}
