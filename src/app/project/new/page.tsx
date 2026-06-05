import Link from "next/link";

import { NewProjectForm } from "@/components/project-shell/new-project-form";

export default function NewProjectPage() {
  return (
    <main className="vf-new-project">
      <Link className="vf-wordmark" href="/dashboard">VentureForge</Link>
      <section>
        <p className="vf-section-label">New project</p>
        <h1>Tell us the rough idea.</h1>
        <p>A name and one sentence are enough to start. Next, the step-by-step Builder will help you fill in the blanks.</p>
        <NewProjectForm />
      </section>
    </main>
  );
}
