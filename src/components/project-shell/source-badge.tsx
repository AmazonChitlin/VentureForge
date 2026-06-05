import type { SourceReference } from "@/engine/shared/source-reference";

export function SourceBadge({ source }: { source: SourceReference }) {
  const content = (
    <>
      <b>{plainSourceType(source)}</b>
      <span>{source.title}</span>
    </>
  );
  return source.url ? (
    <a
      className="vf-source-badge"
      href={source.url}
      rel="noreferrer"
      target="_blank"
      title={source.notes}
    >
      {content}
    </a>
  ) : (
    <span className="vf-source-badge" title={source.notes}>
      {content}
    </span>
  );
}

function plainSourceType(source: SourceReference): string {
  if (source?.sourceType === "official" && /census/i.test(`${source.sourceName} ${source.title}`)) {
    return /partial/i.test(`${source.title} ${source.notes ?? ""}`)
      ? "Partial Census data"
      : "Official Census data";
  }
  if (source?.sourceType === "official" && /\bbls\b|bureau of labor statistics/i.test(`${source.sourceName} ${source.title}`)) {
    return /partial/i.test(`${source.title} ${source.notes ?? ""}`)
      ? "Partial BLS data"
      : "Official BLS data";
  }
  if (source?.sourceType === "official" && /small business administration|\bsba\b|score|sbdc/i.test(`${source.sourceName} ${source.title}`)) {
    return "Official SBA resource";
  }
  return {
    official: "Official source",
    user: "Your answer",
    ai_generated: "AI-generated draft",
    mock: "Sample data",
    manual: "Manually added source",
    plugin: "Add-on source",
  }[source.sourceType];
}
