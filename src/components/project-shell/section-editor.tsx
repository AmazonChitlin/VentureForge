"use client";

import { useState } from "react";

export function SectionEditor({ section }: { section: any }) {
  const [content, setContent] = useState(section.editableContent);
  const [locked, setLocked] = useState(section.locked);
  return (
    <article className="vf-section-editor">
      <header>
        <div>
          <h3>{section.title}</h3>
          <small>Draft confidence: {section.confidenceScore}%</small>
        </div>
        <button type="button" onClick={() => setLocked((value: boolean) => !value)}>
          {locked ? "Unlock section" : "Lock section"}
        </button>
      </header>
      <textarea
        aria-label={`${section.title} editable content`}
        disabled={locked}
        onChange={(event) => setContent(event.target.value)}
        rows={8}
        value={content}
      />
      <footer>
        <span>{section.missingInformation.length ? `${section.missingInformation.length} item(s) need review` : "Ready for review"}</span>
        <button type="button" disabled={locked} title={section.regenerateMetadata.regenerationGuidance}>
          Rewrite unlocked draft
        </button>
      </footer>
    </article>
  );
}
