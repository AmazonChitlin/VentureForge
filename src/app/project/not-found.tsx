import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <main className="vf-auth-page">
      <section className="vf-auth-card">
        <p className="vf-section-label">Project unavailable</p>
        <h1>We could not open that project.</h1>
        <p>
          It may have been deleted, or it may belong to a different VentureForge
          account. For privacy, projects can only be opened by their owner.
        </p>
        <Link className="vf-button vf-button-primary" href="/dashboard">
          Back to your dashboard
        </Link>
      </section>
    </main>
  );
}
