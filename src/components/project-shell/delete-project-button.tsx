"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function deleteProject() {
    const confirmed = window.confirm(
      "Delete this project and its planning records? This cannot be undone.",
    );
    if (!confirmed) return;

    startTransition(async () => {
      setError("");
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Could not delete this project.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="vf-delete-control">
      <button
        className="vf-text-button vf-danger-link"
        disabled={isPending}
        onClick={deleteProject}
        type="button"
      >
        {isPending ? "Deleting..." : "Delete project"}
      </button>
      {error ? <small>{error}</small> : null}
    </div>
  );
}
