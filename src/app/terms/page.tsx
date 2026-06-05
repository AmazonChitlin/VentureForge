import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="vf-policy-page">
      <Link className="vf-wordmark" href="/">VentureForge</Link>
      <section>
        <p className="vf-section-label">Terms and disclaimer</p>
        <h1>VentureForge is an educational planning tool.</h1>
        <p>
          VentureForge helps private beta users organize business ideas,
          assumptions, checklists, and draft planning materials. It does not
          replace professional advice or official agency guidance.
        </p>
        <ul>
          <li>No legal, tax, accounting, financial, or investment advice.</li>
          <li>No guarantee of business success, revenue, customers, loans, grants, or funding.</li>
          <li>Verify state, local, licensing, tax, and filing requirements with official agencies.</li>
          <li>Review financial projections with a CPA, bookkeeper, lender, or qualified advisor.</li>
          <li>Review contracts, legal structure, leases, and compliance questions with an attorney where needed.</li>
        </ul>
        <p>
          During private beta, use estimates and plain descriptions. Do not
          enter Social Security numbers, full bank account numbers, credit card
          numbers, private credit reports, passwords, or private account logins.
        </p>
      </section>
    </main>
  );
}
