"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { PrivacySafetyNotice } from "@/components/privacy/privacy-safety-notice";
import { ProjectModuleScreen } from "@/components/project-shell/project-module-screen";
import type { WorkspaceProject } from "@/lib/project-workspace/types";

const financialFields = [
  ["startupCosts", "Opening costs", "Estimate only. Do not enter bank account details."],
  ["fixedMonthlyCosts", "Other monthly bills", "Estimate only. Do not enter bank account details."],
  ["variableCosts", "Cost for each sale", "Estimate only. Do not enter bank account details."],
  ["pricePerUnitService", "Price for one normal sale", "Estimate only. Do not enter bank account details."],
  ["expectedUnitSales", "Expected monthly sales", "Use a careful guess and update it after testing demand."],
  ["rent", "Monthly rent", "Estimate only. Do not enter bank account details."],
  ["payroll", "Monthly pay for workers", "Estimate only. Do not enter bank account details."],
  ["marketing", "Monthly marketing", "Estimate only. Do not enter bank account details."],
  ["availableOwnerCapital", "Money you can safely put in", "Estimate only. Do not enter bank account details."],
] as const;

export function FinancialsScreen({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<WorkspaceProject>();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const load = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setProject(payload.project);
  }, [projectId]);
  useEffect(() => { load().catch((loadError: Error) => setError(loadError.message)); }, [load]);
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          body: JSON.stringify({ financialInput: Object.fromEntries(financialFields.map(([key]) => [key, Number(form.get(key) || 0)])) }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error);
        await load();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Could not save estimate numbers.");
      }
    });
  }
  return (
    <>
      <ProjectModuleScreen module="financials" projectId={projectId} />
      <aside className="vf-financial-editor">
        {error ? <p className="vf-workspace-error">{error}</p> : null}
        <details>
          <summary>Edit the numbers behind this estimate</summary>
          <PrivacySafetyNotice compact />
          <p>Every number is editable. Leave a field blank if you are unsure, then review important estimates with a CPA or bookkeeper.</p>
          <form onSubmit={save}>
            {financialFields.map(([key, label, help]) => (
              <label key={key}>{label}<small>{help}</small><input defaultValue={(project?.financialInput as any)?.[key] ?? ""} name={key} type="number" /></label>
            ))}
            <button className="vf-button vf-button-primary" disabled={isPending} type="submit">Save estimate numbers</button>
          </form>
        </details>
      </aside>
    </>
  );
}
