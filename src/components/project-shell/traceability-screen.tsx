"use client";

import { useCallback, useEffect, useState } from "react";

import { ConfidenceBadge } from "@/components/project-shell/confidence-badge";
import { ProjectPageShell } from "@/components/project-shell/project-page-shell";
import { SourceBadge } from "@/components/project-shell/source-badge";
import {
  traceabilityStageTitle,
  type TraceabilityReport,
  type TraceabilityStage,
} from "@/lib/project-workspace/traceability";
import type { WorkspaceProject } from "@/lib/project-workspace/types";

export function TraceabilityScreen({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<WorkspaceProject>();
  const [report, setReport] = useState<TraceabilityReport>();
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [projectResponse, traceabilityResponse] = await Promise.all([
      fetch(`/api/projects/${projectId}`),
      fetch(`/api/projects/${projectId}/traceability`),
    ]);
    const projectPayload = await projectResponse.json();
    const traceabilityPayload = await traceabilityResponse.json();
    if (!projectResponse.ok) throw new Error(projectPayload.error);
    if (!traceabilityResponse.ok) throw new Error(traceabilityPayload.error);
    setProject(projectPayload.project);
    setReport(traceabilityPayload.traceability);
  }, [projectId]);

  useEffect(() => {
    load().catch((loadError: Error) => setError(loadError.message));
  }, [load]);

  return (
    <ProjectPageShell active="traceability" project={project} projectId={projectId}>
      <header className="vf-workspace-page-header">
        <div>
          <p className="vf-section-label">Behind the scenes</p>
          <h1>How your answers are used</h1>
          <p>
            See how your answers become planning drafts and which later drafts
            may change when you learn something new.
          </p>
        </div>
        {report ? (
          <strong className="vf-traceability-summary">
            {report.generatedStageCount}/{report.totalStageCount} drafts ready
          </strong>
        ) : null}
      </header>
      {error ? <p className="vf-workspace-error">{error}</p> : null}
      {!report ? (
        <section className="vf-workspace-empty">
          <h2>Loading how your answers are used...</h2>
        </section>
      ) : (
        <ol className="vf-traceability-chain">
          {report.stages.map((stage, index) => (
            <li className="vf-traceability-stage" key={stage.key}>
              <StageCard index={index} stage={stage} />
              {index < report.stages.length - 1 ? (
                <span aria-hidden="true" className="vf-traceability-arrow">↓</span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </ProjectPageShell>
  );
}

function StageCard({ index, stage }: { index: number; stage: TraceabilityStage }) {
  return (
    <article className="vf-traceability-card">
      <header>
        <div>
          <p className="vf-section-label">Stage {index + 1}</p>
          <h2>{stage.title}</h2>
        </div>
        <div className="vf-traceability-status">
          <span className={stage.generated ? "is-generated" : "is-pending"}>
            {stage.generated ? "Generated" : "Not generated"}
          </span>
          {stage.confidence === null ? null : (
            <ConfidenceBadge confidence={stage.confidence} />
          )}
        </div>
      </header>
      <div className="vf-traceability-grid">
        <TraceList title="Information used" items={stage.inputsConsumed} />
        <TraceList title="Draft created" items={stage.outputsProduced} />
        <TraceList title="Planning guesses to check" items={stage.assumptions} empty="Build this draft to inspect its planning guesses." />
        <TraceList title="What to double-check" items={stage.warnings} empty="Nothing extra to double-check yet." />
        <TraceList title="Helpful next steps" items={stage.nextActions} empty="Build this draft to inspect its suggested next steps." />
        <TraceList
          title="Later drafts that may change"
          items={stage.downstreamStages.map(traceabilityStageTitle)}
          empty="This is a final package stage."
        />
      </div>
      <section className="vf-traceability-sources">
        <h3>Where this came from</h3>
        {stage.sources.length ? (
          <div className="vf-source-badges">
            {stage.sources.map((source) => (
              <SourceBadge key={`${source.id}:${source.url ?? ""}`} source={source} />
            ))}
          </div>
        ) : (
          <p>{stage.generated ? "No sources recorded." : "Build this draft to inspect its sources."}</p>
        )}
      </section>
    </article>
  );
}

function TraceList({
  title,
  items,
  empty = "None recorded.",
}: {
  title: string;
  items: string[];
  empty?: string;
}) {
  return (
    <section>
      <h3>{title}</h3>
      {items.length ? (
        <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
      ) : (
        <p>{empty}</p>
      )}
    </section>
  );
}
