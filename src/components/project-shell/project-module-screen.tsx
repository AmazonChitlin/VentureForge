"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { EngineResultCard } from "@/components/project-shell/engine-result-card";
import { ModuleResultView } from "@/components/project-shell/module-result-view";
import { ProjectPageShell } from "@/components/project-shell/project-page-shell";
import { workspaceModuleCatalogByKey } from "@/lib/project-workspace/catalog";
import type {
  WorkspaceModuleKey,
  WorkspaceProject,
} from "@/lib/project-workspace/types";

export function ProjectModuleScreen({
  projectId,
  module,
}: {
  projectId: string;
  module: WorkspaceModuleKey;
}) {
  const descriptor = workspaceModuleCatalogByKey.get(module)!;
  const [project, setProject] = useState<WorkspaceProject>();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setProject(payload.project);
  }, [projectId]);

  useEffect(() => {
    load().catch((loadError: Error) => setError(loadError.message));
  }, [load]);

  function generate() {
    startTransition(async () => {
      setError("");
      const response = await fetch(`/api/projects/${projectId}/run`, {
        body: JSON.stringify({ module }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.retryAvailable ? `${payload.error} You can retry when ready.` : payload.error);
        return;
      }
      setProject(payload.project);
    });
  }

  const result = project?.outputs[module];
  const generationStatus = project?.generationStatuses[module];
  return (
    <ProjectPageShell active={module} project={project} projectId={projectId}>
      <header className="vf-workspace-page-header">
        <div>
          <p className="vf-section-label">Optional detailed workspace</p>
          <h1>{descriptor.title}</h1>
          <p>{descriptor.description}</p>
        </div>
        {result ? (
          <button className="vf-button vf-button-primary" disabled={isPending} onClick={generate} type="button">
            {isPending ? "Refreshing draft..." : "Refresh this draft"}
          </button>
        ) : null}
      </header>
      {generationStatus?.status === "pending" ? (
        <p className="vf-workspace-info">VentureForge is generating this draft and saving the related records.</p>
      ) : null}
      {generationStatus?.status === "failed" ? (
        <p className="vf-workspace-error">
          {generationStatus.errorMessage ?? "VentureForge could not safely finish this generation."}{" "}
          {generationStatus.retryAvailable ? "You can retry this draft." : null}
        </p>
      ) : null}
      {error ? <p className="vf-workspace-error">{error}</p> : null}
      {!project ? <LoadingCard /> : result ? (
        <EngineResultCard result={result}>
          <ModuleResultView data={result.data} module={module} />
        </EngineResultCard>
      ) : (
        <EmptyModule title={descriptor.title} description={descriptor.description} onGenerate={generate} />
      )}
    </ProjectPageShell>
  );
}

function EmptyModule({
  title,
  description,
  onGenerate,
}: {
  title: string;
  description: string;
  onGenerate: () => void;
}) {
  return (
    <section className="vf-workspace-empty">
      <p className="vf-section-label">Ready when you are</p>
      <h2>Build your first {title.toLowerCase()} draft.</h2>
      <p>{description} VentureForge will also prepare any earlier planning steps this draft needs.</p>
      <button className="vf-button vf-button-primary" onClick={onGenerate} type="button">Build this draft</button>
    </section>
  );
}

function LoadingCard() {
  return <section className="vf-workspace-empty"><h2>Loading your workspace...</h2></section>;
}
