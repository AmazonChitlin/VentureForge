import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="vf-policy-page">
      <Link className="vf-wordmark" href="/">VentureForge</Link>
      <section>
        <p className="vf-section-label">Privacy for private beta</p>
        <h1>Use planning estimates, not sensitive private records.</h1>
        <p>
          VentureForge stores your account record, projects, guided answers,
          generated planning drafts, export records, and basic audit logs for
          project actions.
        </p>
        <h2>What not to enter</h2>
        <ul>
          <li>Social Security numbers, full bank account numbers, routing numbers, or credit card numbers.</li>
          <li>Passwords, private account logins, tax IDs, or private credit reports.</li>
          <li>Exact personal financial records when a rough planning estimate is enough.</li>
        </ul>
        <h2>Deleting data</h2>
        <p>
          Each project page includes a Delete Project option. The dashboard
          includes a Delete All My Data scaffold that removes your projects and
          generated planning records while keeping your sign-in record for beta
          access.
        </p>
        <h2>Contact</h2>
        <p>Private beta contact placeholder: support@example.com.</p>
      </section>
    </main>
  );
}
