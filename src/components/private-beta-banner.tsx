import Link from "next/link";

export function PrivateBetaBanner() {
  return (
    <div className="vf-private-beta-banner" role="status">
      <strong>Private beta.</strong>{" "}
      Do not enter Social Security numbers, full bank account numbers, credit
      card numbers, passwords, private tax records, private credit reports, or
      private API keys. Use estimates for planning.{" "}
      <Link href="/privacy">Privacy</Link>
      <span aria-hidden="true"> · </span>
      <Link href="/terms">Terms</Link>
    </div>
  );
}
