export function PrivacySafetyNotice({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <aside className={compact ? "vf-privacy-notice is-compact" : "vf-privacy-notice"}>
      <strong>Private testing safety</strong>
      <p>
        Private beta. Do not enter Social Security numbers, full bank account
        numbers, credit card numbers, passwords, private tax records, private
        credit reports, or private API keys. Use estimates for planning.
      </p>
      {!compact ? (
        <ul>
          <li>Financial numbers should be estimates for planning.</li>
          <li>Do not enter full bank account or routing details.</li>
          <li>Do not paste passwords, private API keys, credit reports, or private logins.</li>
          <li>EIN-like tax IDs show a caution. Avoid entering them during testing unless truly necessary.</li>
        </ul>
      ) : null}
    </aside>
  );
}
