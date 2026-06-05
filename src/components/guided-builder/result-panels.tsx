import { BuilderIcon } from "@/components/guided-builder/icons";
import { FriendlyEmptyState } from "@/components/guided-builder/empty-state";
import { FriendlyWarning } from "@/components/guided-builder/friendly-warning";
import { HelpBubble } from "@/components/guided-builder/help-bubble";
import type { BusinessConcept } from "@/engine/concept/schema";
import type { FeasibilityEvaluation } from "@/engine/feasibility/schema";
import type { FinancialProjection } from "@/engine/financials/schema";
import type { GuidedAnswerMapping } from "@/engine/guided-builder/guided-answer-mapper";
import type { StateLaunchChecklist } from "@/engine/state-programs/schema";

export function FeasibilityResultsPanel({
  result,
  confidence,
}: {
  result: FeasibilityEvaluation;
  confidence: number;
}) {
  return (
    <div className="vf-result-stack">
      <section className="vf-score-card">
        <div className="vf-score-ring">
          <strong>{result.totalFeasibilityScore}</strong>
          <span>out of 100</span>
        </div>
        <div>
          <p className="vf-section-label">Your first feasibility check</p>
          <h2>{friendlyRecommendation(result.recommendation)}</h2>
          <p>{result.plainEnglishSummary}</p>
          <span className="vf-confidence-badge">
            {confidence}% confidence based on what we know today
          </span>
        </div>
      </section>
      <div className="vf-two-column">
        <ResultList title="3 reasons this could work" items={result.topStrengths.slice(0, 3)} tone="positive" />
        <ResultList title="Check these before spending money" items={result.doNotSpendMoneyUntil.slice(0, 3)} tone="caution" />
      </div>
      <ResultList title="Your safest next steps" items={result.validationSteps.slice(0, 4)} />
    </div>
  );
}

export function FinancialGuidedPanel({
  projection,
}: {
  projection: FinancialProjection;
}) {
  const month = projection.monthlyProfitLoss12Months[0];
  const breakEven = projection.breakEvenAnalysis;
  return (
    <div className="vf-result-stack">
      <section className="vf-financial-hero">
        <div>
          <p className="vf-section-label">Simple monthly estimate</p>
          <h2>
            If you charge ${formatNumber(month.revenue / Math.max(1, month.unitSales))} and make{" "}
            {formatNumber(month.unitSales)} sales per month, that is{" "}
            <strong>${formatNumber(month.revenue)}/month</strong> before expenses.
          </h2>
          <p>This is an estimate. Every number can be changed as you learn more.</p>
        </div>
        <div className="vf-money-summary">
          <span>Estimated monthly sales</span>
          <strong>${formatNumber(month.revenue)}</strong>
          <span>Estimated monthly take-home before owner draw</span>
          <strong>${formatNumber(month.netIncome)}</strong>
        </div>
      </section>
      <section className="vf-break-even">
        <div>
          <h3>
            Break-even estimate <HelpBubble term="breakEven" />
          </h3>
          <p>
            {breakEven.breakEvenUnits === null
              ? "We need a few more cost details before this estimate is useful."
              : `About ${Math.ceil(breakEven.breakEvenUnits)} normal sales per month would cover the current cost estimate.`}
          </p>
        </div>
        <div className="vf-break-even-bar">
          <span style={{ width: `${Math.min(100, Math.max(8, (breakEven.breakEvenUnits ?? 0) / Math.max(1, month.unitSales) * 100))}%` }} />
        </div>
      </section>
      <details className="vf-details-panel">
        <summary>See detailed numbers</summary>
        <div className="vf-detail-grid">
          {projection.editableAssumptions.slice(0, 10).map((assumption) => (
            <div key={assumption.key}>
              <span>{assumption.label}</span>
              <strong>${formatNumber(assumption.value)}</strong>
              <small>{assumption.isPlaceholder ? "Placeholder estimate" : "Your answer"}</small>
            </div>
          ))}
        </div>
      </details>
      <FriendlyWarning>
        These projections are planning estimates. Review important numbers with a CPA or bookkeeper before making financial commitments.
      </FriendlyWarning>
    </div>
  );
}

export function StateChecklistPanel({
  checklist,
}: {
  checklist: StateLaunchChecklist;
}) {
  if (!checklist.supportedState) {
    return (
      <FriendlyEmptyState
        title="Choose your starting state"
        description="Tell us which state you plan to start in, and we will prepare a first-pass setup checklist with official links."
      />
    );
  }
  return (
    <div className="vf-result-stack">
      <section className="vf-section-intro">
        <p className="vf-section-label">{checklist.stateName} setup checklist</p>
        <h2>Start with the items most likely to matter.</h2>
        <p>
          This is a planning checklist. Verify each step with the official agency before filing or spending money.
        </p>
        {checklist.lastVerifiedAt ? (
          <p className="vf-section-label">State file last checked: {formatDate(checklist.lastVerifiedAt)}</p>
        ) : null}
        {checklist.needsVerification ? (
          <span className="vf-status is-needs-work">Some resources need verification</span>
        ) : null}
      </section>
      <div className="vf-checklist">
        {checklist.checklist.slice(0, 9).map((item, index) => (
          <article key={item.id}>
            <span className="vf-check-number">{index + 1}</span>
            <div>
              <p className="vf-section-label">{item.estimatedDifficulty} effort</p>
              <h3>{item.task}</h3>
              <p>{item.description}</p>
              {item.needsVerification ? (
                <span className="vf-status is-needs-work">Needs verification</span>
              ) : null}
              <small>Last checked: {formatDate(item.lastVerifiedAt)}</small>
              {item.officialUrl ? (
                <a href={item.officialUrl} rel="noreferrer" target="_blank">
                  Official agency: {item.agency}
                </a>
              ) : (
                <small>No single official URL. Contact {item.agency} directly.</small>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function LaunchRoadmapPanel({
  mapping,
  checklist,
}: {
  mapping: GuidedAnswerMapping;
  checklist: StateLaunchChecklist;
}) {
  const physical = ["physical_location", "hybrid"].includes(
    mapping.intake.idea.businessModel,
  );
  return (
    <div className="vf-result-stack">
      <section className="vf-section-intro">
        <p className="vf-section-label">Your launch roadmap</p>
        <h2>Move in small, useful steps.</h2>
        <p>Start with proof. Save bigger commitments until the important guesses are tested.</p>
      </section>
      <div className="vf-roadmap">
        <RoadmapBucket title="Today" items={["Write down the first customer you want to interview.", "List the 3 biggest guesses you need to test."]} />
        <RoadmapBucket title="This week" items={["Talk with 5 possible customers.", "Price the essential startup items.", "Research 3 customer alternatives or competitors."]} />
        <RoadmapBucket
          title="30 days"
          items={[
            "Run one small paid or behavioral demand test.",
            ...(physical ? ["Verify zoning and occupancy questions before considering a lease."] : ["Create a simple landing page and test one clear offer."]),
            ...(checklist.checklist.length > 0 ? ["Review your state setup checklist with the official agencies."] : []),
          ]}
        />
        <RoadmapBucket title="60–90 days" items={["Review results and update your numbers.", "Choose the next smallest responsible commitment.", "Set a weekly customer-feedback habit."]} />
      </div>
    </div>
  );
}

export function PlanBuilderPanel({
  mapping,
}: {
  mapping: GuidedAnswerMapping;
}) {
  const hasMarketBasics = Boolean(mapping.intake.idea.targetCustomer && mapping.intake.idea.state);
  const sections = [
    ["Executive Summary", true, "A short overview of the business and what you need next."],
    ["Business Concept", Boolean(mapping.intake.idea.businessIdea), "What you sell, who it helps, and the first proof you need."],
    ["Customer Analysis", Boolean(mapping.intake.idea.targetCustomer), "Who may buy first and what you still need to ask them."],
    ["Market Research", hasMarketBasics, "Local demand, alternatives, and reliable source notes."],
    ["Financial Plan", mapping.intake.idea.expectedStartupCosts > 0, "Startup estimate, simple sales model, and planning guesses to check."],
    ["Launch Roadmap", true, "Your safest steps from today through launch."],
  ] as const;
  return (
    <div className="vf-result-stack">
      <section className="vf-section-intro">
        <p className="vf-section-label">Your Plan Builder</p>
        <h2>Your answers are already becoming a business plan.</h2>
        <p>Review one section at a time. A draft can stay a draft until the research is strong enough.</p>
      </section>
      <div className="vf-plan-sections">
        {sections.map(([title, ready, description]) => (
          <article key={title}>
            <div>
              <span className={`vf-status ${ready ? "is-ready" : "is-needs-work"}`}>
                {ready ? "Draft ready" : "Needs more info"}
              </span>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
            <div className="vf-card-actions">
              <button type="button"><BuilderIcon name="pencil" size={15} /> Edit</button>
              <button type="button"><BuilderIcon name="refresh" size={15} /> Regenerate</button>
              <button type="button"><BuilderIcon name="lock" size={15} /> Lock</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function WebsiteStarterPanel({
  mapping,
  concept,
  tone,
  onToneChange,
}: {
  mapping: GuidedAnswerMapping;
  concept: BusinessConcept;
  tone: string;
  onToneChange: (value: string) => void;
}) {
  const idea = mapping.intake.idea;
  const businessName = idea.businessName || "Your Business";
  return (
    <div className="vf-result-stack">
      <section className="vf-website-controls">
        <div>
          <p className="vf-section-label">Website starter</p>
          <h2>Give the business a clear first impression.</h2>
          <p>Your customer and positioning answers shape the starter copy.</p>
        </div>
        <label>
          What vibe should your business have?
          <select onChange={(event) => onToneChange(event.target.value)} value={tone}>
            <option value="friendly">Friendly</option>
            <option value="professional">Professional</option>
            <option value="punk_edgy">Punk / edgy</option>
            <option value="modern">Modern</option>
            <option value="local_community">Local / community</option>
          </select>
        </label>
      </section>
      <section className={`vf-website-preview tone-${tone}`}>
        <header>
          <strong>{businessName}</strong>
          <nav>About&nbsp;&nbsp; What we offer&nbsp;&nbsp; Contact</nav>
        </header>
        <div>
          <p>{[idea.city, idea.state].filter(Boolean).join(", ") || "Your community"}</p>
          <h2>{idea.productOrService || "A clear offer for your first customers"}</h2>
          <span>
            {idea.proposedSolution ||
              concept.coreCustomerBenefit ||
              "Tell visitors why your business is useful and different."}
          </span>
          <button type="button">Learn more</button>
        </div>
        <footer>Made for {idea.targetCustomer || "the customers you want to serve first"}.</footer>
      </section>
      <div className="vf-export-actions">
        <button className="vf-button vf-button-primary" type="button">Export static site</button>
        <button className="vf-button vf-button-secondary" type="button">Copy website text</button>
      </div>
    </div>
  );
}

function ResultList({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "default" | "positive" | "caution";
}) {
  return (
    <section className={`vf-result-list tone-${tone}`}>
      <h3>{title}</h3>
      <ul>
        {(items.length > 0 ? items : ["We need a little more information before this list is reliable."]).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function RoadmapBucket({ title, items }: { title: string; items: string[] }) {
  return (
    <article>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </article>
  );
}

function friendlyRecommendation(value: FeasibilityEvaluation["recommendation"]): string {
  if (value === "strong opportunity") return "This looks ready for a careful next step";
  if (value === "promising but needs validation") return "Promising, but let’s get more proof";
  if (value === "risky") return "Slow down and check the biggest risks first";
  if (value === "weak opportunity") return "The current version needs a rethink";
  return "We need a few more answers before this is reliable";
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}
