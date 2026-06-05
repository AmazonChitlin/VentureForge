export function FundingMatchCard({ match }: { match: any }) {
  return (
    <article className="vf-funding-card">
      <div>
        <p>{match.type.replaceAll("_", " ")}</p>
        <strong>{match.opportunityName}</strong>
      </div>
      <b>{match.matchScore}% research-fit estimate</b>
      <section>
        <h4>Why it may fit</h4>
        <ul>{match.whyItFits.map((item: string) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section>
        <h4>Why it may not fit</h4>
        <ul>{match.whyItMayNotFit.map((item: string) => <li key={item}>{item}</li>)}</ul>
      </section>
      <small>
        Planning template only. Final eligibility, approval, terms, and
        availability are determined by the lender, investor, or program
        administrator.
      </small>
      <a href={match.url} rel="noreferrer" target="_blank">Verify official source</a>
    </article>
  );
}
