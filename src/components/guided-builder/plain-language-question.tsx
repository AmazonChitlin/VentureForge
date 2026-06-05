import type { ReactNode } from "react";

import { WhyWeAskThis } from "@/components/guided-builder/why-we-ask-this";

export function PlainLanguageQuestion({
  question,
  helperText,
  whyItMatters,
  examples,
  children,
}: {
  question: string;
  helperText: string;
  whyItMatters: string;
  examples: string[];
  children: ReactNode;
}) {
  return (
    <div className="vf-question-card">
      <h2>{question}</h2>
      <p className="vf-question-helper">{helperText}</p>
      {children}
      {examples.length > 0 ? (
        <div className="vf-examples">
          <strong>Examples</strong>
          <ul>
            {examples.map((example) => (
              <li key={example}>{example}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <WhyWeAskThis>{whyItMatters}</WhyWeAskThis>
    </div>
  );
}
