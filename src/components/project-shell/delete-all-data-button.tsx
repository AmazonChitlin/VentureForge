"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DeleteAllDataButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function deleteAllData() {
    const confirmed = window.confirm(
      "Delete all of your VentureForge projects and generated planning records? Your login record will remain for private testing.",
    );
    if (!confirmed) return;

    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/account/data", { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.error ?? "Could not delete your project data.");
        return;
      }
      setMessage(payload.message ?? "Deleted your project data.");
      router.refresh();
    });
  }

  return (
    <div className="vf-delete-control">
      <button
        className="vf-text-button vf-danger-link"
        disabled={isPending}
        onClick={deleteAllData}
        type="button"
      >
        {isPending ? "Deleting..." : "Delete all my project data"}
      </button>
      {message ? <small>{message}</small> : null}
    </div>
  );
}
