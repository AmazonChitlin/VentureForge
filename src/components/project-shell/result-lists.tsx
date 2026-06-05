export function WarningList({ items }: { items: string[] }) {
  return <ResultList items={items} title="What to double-check" tone="warning" empty="Nothing extra to double-check yet." />;
}

export function MissingInformationList({ items }: { items: string[] }) {
  return <ResultList items={items} title="What we still need" tone="missing" empty="We have enough information for this first draft." />;
}

export function NextActionsList({ items }: { items: string[] }) {
  return <ResultList items={items} title="Helpful next steps" tone="actions" empty="Review this draft and choose the next Builder step." />;
}

function ResultList({
  items,
  title,
  tone,
  empty,
}: {
  items: string[];
  title: string;
  tone: string;
  empty: string;
}) {
  return (
    <section className={`vf-result-list is-${tone}`}>
      <h3>{title}</h3>
      {items.length ? (
        <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
      ) : (
        <p>{empty}</p>
      )}
    </section>
  );
}
