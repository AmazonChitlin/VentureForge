import type { EngineResult } from "@/engine/shared/engine-result";
import { ConfidenceBadge } from "@/components/project-shell/confidence-badge";
import { SourceBadge } from "@/components/project-shell/source-badge";
import {
  MissingInformationList,
  NextActionsList,
  WarningList,
} from "@/components/project-shell/result-lists";
import { GlobalGuardrailNotice } from "@/components/global-guardrail-notice";
import {
  GLOBAL_GUARDRAILS,
  MOCK_DATA_WARNING,
} from "@/engine/shared/guardrails";

export function EngineResultCard({
  result,
  children,
}: {
  result: EngineResult<unknown>;
  children: React.ReactNode;
}) {
  const hasMockData = result.warnings.includes(MOCK_DATA_WARNING);
  const visibleWarnings = result.warnings.filter(
    (warning) =>
      warning !== MOCK_DATA_WARNING &&
      !GLOBAL_GUARDRAILS.includes(
        warning as (typeof GLOBAL_GUARDRAILS)[number],
      ),
  );
  if (hasMockData) {
    visibleWarnings.push(
      "This draft includes sample data. Replace it with verified sources before relying on it.",
    );
  }
  return (
    <div className="vf-engine-result">
      <div className="vf-engine-result-head">
        <div>
          <p className="vf-section-label">Planning draft</p>
          <h2>Here is what we found so far</h2>
        </div>
        <ConfidenceBadge confidence={result.confidence} />
      </div>
      <GlobalGuardrailNotice />
      {children}
      <div className="vf-result-grid">
        <MissingInformationList items={result.missingInformation} />
        <WarningList items={visibleWarnings} />
        <NextActionsList items={result.nextActions} />
      </div>
      <details className="vf-result-details">
        <summary>Show planning guesses and sources</summary>
        <div className="vf-result-details-grid">
          <section>
            <h3>Planning guesses to check</h3>
            <ul>{result.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <section>
            <h3>Where this came from</h3>
            <div className="vf-source-badges">
              {result.sources.map((source) => <SourceBadge key={source.id} source={source} />)}
            </div>
          </section>
        </div>
      </details>
    </div>
  );
}
