"use client";

import { useState } from "react";

import { BuilderIcon } from "@/components/guided-builder/icons";
import {
  beginnerHelpContent,
  type BeginnerHelpTerm,
} from "@/engine/guided-builder/help-content";

export function HelpBubble({
  term,
  label,
}: {
  term: BeginnerHelpTerm;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="vf-help-bubble">
      <button
        aria-expanded={open}
        aria-label={`Explain ${label ?? term}`}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <BuilderIcon name="help" size={15} />
      </button>
      {open ? <span role="tooltip">{beginnerHelpContent[term]}</span> : null}
    </span>
  );
}
