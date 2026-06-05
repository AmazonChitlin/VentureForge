"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ProjectPageShell } from "@/components/project-shell/project-page-shell";
import { workspaceModuleCatalog } from "@/lib/project-workspace/catalog";
import type { WorkspaceProject } from "@/lib/project-workspace/types";

export function OverviewScreen({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<WorkspaceProject>();
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setProject(payload.project);
  }, [projectId]);
  useEffect(() => { load().catch((loadError: Error) => setError(loadError.message)); }, [load]);
  if (!project) return <ProjectPageShell active="overview" projectId={projectId}>{error ? <p className="vf-workspace-error">{error}</p> : <section className="vf-workspace-empty"><h2>Loading project...</h2></section>}</ProjectPageShell>;
  const completed = Object.keys(project.outputs);
  const next = workspaceModuleCatalog.find((item) => !project.outputs[item.key]);
  return (
    <ProjectPageShell active="overview" project={project} projectId={projectId}>
      <header className="vf-workspace-page-header">
        <div><p className="vf-section-label">Project overview</p><h1>{project.name}</h1><p>{project.intake.idea.businessIdea || "Add a plain-language business idea to begin."}</p></div>
        <Link className="vf-button vf-button-primary" href={`/project/${projectId}/builder`}>Continue step by step</Link>
      </header>
      <section className="vf-overview-hero">
        <div><strong>{completed.length}</strong><span>of {workspaceModuleCatalog.length} detailed drafts ready</span></div>
        <div><p>Recommended next action</p><h2>Continue the step-by-step Builder</h2><Link href={`/project/${projectId}/builder`}>Answer the next simple question</Link></div>
      </section>
      <details className="vf-overview-details">
        <summary>Show detailed workspace tools</summary>
        <p>These tools are optional. Use them when you want to inspect or refine a specific planning draft.</p>
        {next ? <p className="vf-overview-next">Next detailed draft: <Link href={`/project/${projectId}/${next.route}`}>{next.title}</Link></p> : null}
        <section className="vf-module-grid">
          {workspaceModuleCatalog.map((item) => (
            <Link className={project.outputs[item.key] ? "is-complete" : ""} href={`/project/${projectId}/${item.route}`} key={item.key}>
              <small>{project.outputs[item.key] ? "Draft ready" : "Not drafted yet"}</small>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </Link>
          ))}
        </section>
      </details>
    </ProjectPageShell>
  );
}
