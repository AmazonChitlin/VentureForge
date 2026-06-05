"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PrivacySafetyNotice } from "@/components/privacy/privacy-safety-notice";
import { DeleteAllDataButton } from "@/components/project-shell/delete-all-data-button";
import type { WorkspaceProjectSummary } from "@/lib/project-workspace/types";

export function DashboardScreen() {
  const [projects, setProjects] = useState<WorkspaceProjectSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/projects")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        setProjects(payload.projects);
      })
      .catch((loadError: Error) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <main className="vf-dashboard">
      <header>
        <div>
          <Link className="vf-wordmark" href="/">VentureForge</Link>
          <p>Build your business step by step</p>
        </div>
        <Link className="vf-button vf-button-primary" href="/project/new">Start a new idea</Link>
      </header>
      <section className="vf-dashboard-intro">
        <p className="vf-section-label">Your projects</p>
        <h1>Pick up where you left off.</h1>
        <p>Continue with simple questions. Detailed planning tools are available when you want to look behind the scenes.</p>
        <PrivacySafetyNotice compact />
      </section>
      {error ? <p className="vf-workspace-error">{error}</p> : null}
      <section className="vf-project-grid">
        {loading ? (
          <article className="vf-dashboard-empty"><h2>Loading your projects...</h2></article>
        ) : projects.length ? projects.map((project) => (
          <article key={project.id}>
            <small>{project.location}</small>
            <h2>{project.name}</h2>
            <p>{project.businessIdea || "Add a plain-language idea to begin."}</p>
            <span>{project.completedModules.length} planning draft(s) ready</span>
            <div>
              <Link href={`/project/${project.id}/builder`}>Continue step by step</Link>
              <Link href={`/project/${project.id}/overview`}>View details</Link>
            </div>
          </article>
        )) : (
          <article className="vf-dashboard-empty">
            <small>Start here</small>
            <h2>Tell us your business idea.</h2>
            <p>We will ask one simple question at a time and turn your answers into a practical first plan.</p>
            <Link href="/project/new">Start a new idea</Link>
          </article>
        )}
      </section>
      <section className="vf-dashboard-privacy">
        <p className="vf-section-label">Private testing</p>
        <h2>Need to clear your project data?</h2>
        <p>
          This removes your projects and generated planning records. Your
          sign-in record remains so you can keep testing the app.
        </p>
        <DeleteAllDataButton />
      </section>
    </main>
  );
}
