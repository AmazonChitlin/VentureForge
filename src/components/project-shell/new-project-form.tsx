"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PrivacySafetyNotice } from "@/components/privacy/privacy-safety-notice";
import { scanSensitiveInput } from "@/lib/security/sensitiveInputScanner";

export function NewProjectForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    businessIdea: "",
    city: "",
    state: "",
    businessModel: "service",
  });
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const privacyScan = scanSensitiveInput(form);
    if (privacyScan.shouldBlock) {
      setError(privacyScan.summary);
      return;
    }
    if (privacyScan.cautionFindings.length) {
      setError(privacyScan.summary);
    }
    startTransition(async () => {
      try {
        const response = await fetch("/api/projects", {
          body: JSON.stringify(form),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const payload = await response.json();
        if (!response.ok) {
          setError(payload.error ?? "Could not create project.");
          return;
        }
        router.push(`/project/${payload.project.id}/builder`);
      } catch {
        setError("Could not reach the VentureForge database. Check the server connection and try again.");
      }
    });
  }
  return (
    <form className="vf-workspace-form" onSubmit={submit}>
      <PrivacySafetyNotice compact />
      <label>Business name<small>Use a working name. You can change it later.</small><input onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Needle & Groove Records" required value={form.name} /></label>
      <label>Describe your idea<small>Tell us what you may sell and who it may help. A rough answer is fine.</small><textarea onChange={(event) => setForm({ ...form, businessIdea: event.target.value })} placeholder="A neighborhood record store with curated vinyl and listening events." required rows={4} value={form.businessIdea} /></label>
      <details className="vf-form-more">
        <summary>Add location details now (optional)</summary>
        <p>These answers help us prepare local questions. You can also add them later in the Builder.</p>
        <div>
          <label>City<small>The city helps narrow local research and setup steps.</small><input onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="Tempe" value={form.city} /></label>
          <label>State code<small>Use the two-letter code, such as AZ or PA.</small><input maxLength={2} onChange={(event) => setForm({ ...form, state: event.target.value.toUpperCase() })} placeholder="AZ" value={form.state} /></label>
        </div>
        <label>How will customers buy?<small>This helps us ask the right questions about costs and permits.</small>
          <select onChange={(event) => setForm({ ...form, businessModel: event.target.value })} value={form.businessModel}>
            <option value="service">I provide a service</option><option value="physical_location">Customers visit my location</option><option value="online">Customers buy online</option><option value="mobile">I go to customers</option><option value="home_based">I work from home</option><option value="hybrid">A mix of these</option><option value="manufacturing">I make products</option>
          </select>
        </label>
      </details>
      {error ? <p className="vf-workspace-error">{error}</p> : null}
      <button className="vf-button vf-button-primary" disabled={isPending} type="submit">{isPending ? "Starting..." : "Start step-by-step Builder"}</button>
    </form>
  );
}
