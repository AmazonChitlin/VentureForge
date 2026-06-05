export function ScoreCard({
  label,
  score,
  description,
}: {
  label: string;
  score: number;
  description?: string;
}) {
  return (
    <article className="vf-workspace-score">
      <span>{label}</span>
      <strong>{score}</strong>
      <small>out of 100</small>
      {description ? <p>{description}</p> : null}
    </article>
  );
}

