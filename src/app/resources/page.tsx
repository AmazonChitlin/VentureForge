import Link from "next/link";

import { resources } from "../../../prisma/seed-data";

export default function ResourcesPage() {
  return (
    <main className="vf-library-page">
      <header><Link className="vf-wordmark" href="/dashboard">VentureForge</Link><Link href="/dashboard">Back to dashboard</Link></header>
      <section><p className="vf-section-label">Resource library</p><h1>Official starting points</h1><p>Use these sources to verify planning assumptions, funding paths, and local requirements before relying on them.</p></section>
      <div className="vf-resource-grid">
        {resources.map((resource) => (
          <a href={resource.url} key={resource.url} rel="noreferrer" target="_blank">
            <small>{resource.category}</small><h2>{resource.title}</h2><p>{resource.description}</p><span>{resource.sourceName} ↗</span>
          </a>
        ))}
      </div>
    </main>
  );
}

