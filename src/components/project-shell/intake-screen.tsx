"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { PrivacySafetyNotice } from "@/components/privacy/privacy-safety-notice";
import { ProjectPageShell } from "@/components/project-shell/project-page-shell";
import type { WorkspaceProject } from "@/lib/project-workspace/types";
import { scanSensitiveInput } from "@/lib/security/sensitiveInputScanner";

export function IntakeScreen({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<WorkspaceProject>();
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isPending, startTransition] = useTransition();
  const load = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setProject(payload.project);
  }, [projectId]);
  useEffect(() => { load().catch((error: Error) => setLoadError(error.message)); }, [load]);
  if (!project) {
    return <ProjectPageShell active="intake" projectId={projectId}>{loadError ? <p className="vf-workspace-error">{loadError}</p> : <section className="vf-workspace-empty"><h2>Loading intake...</h2></section>}</ProjectPageShell>;
  }
  const { founder, idea } = project.intake;
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const patch = {
      intake: {
        founder: {
          founderName: text(form, "founderName"),
          founderExperience: text(form, "founderExperience"),
          industryExperience: text(form, "industryExperience"),
          skills: list(form, "skills"),
          availableStartupCapital: number(form, "availableStartupCapital"),
          desiredFundingAmount: number(form, "desiredFundingAmount"),
          creditReadinessSelfAssessment: text(form, "creditReadinessSelfAssessment"),
          riskTolerance: text(form, "riskTolerance"),
          weeklyAvailableHours: number(form, "weeklyAvailableHours"),
          launchTimeline: text(form, "launchTimeline"),
        },
        idea: {
          businessName: text(form, "businessName"),
          businessIdea: text(form, "businessIdea"),
          productOrService: text(form, "productOrService"),
          customerProblem: text(form, "customerProblem"),
          proposedSolution: text(form, "proposedSolution"),
          targetCustomer: text(form, "targetCustomer"),
          city: text(form, "city"),
          county: text(form, "county"),
          state: text(form, "state").toUpperCase(),
          zipCode: text(form, "zipCode"),
          businessModel: text(form, "businessModel"),
          industry: text(form, "industry"),
          naicsGuess: text(form, "naicsGuess"),
          knownCompetitors: list(form, "knownCompetitors"),
          pricingIdea: text(form, "pricingIdea"),
          expectedStartupCosts: number(form, "expectedStartupCosts"),
          staffingPlan: text(form, "staffingPlan"),
          requiredEquipment: list(form, "requiredEquipment"),
          licensingConcerns: list(form, "licensingConcerns"),
          fundingNeed: text(form, "fundingNeed"),
          websiteNeeds: text(form, "websiteNeeds"),
        },
      },
    };
    const privacyScan = scanSensitiveInput(patch);
    if (privacyScan.shouldBlock) {
      setMessage(privacyScan.summary);
      return;
    }
    startTransition(async () => {
      setMessage(privacyScan.cautionFindings.length ? privacyScan.summary : "");
      const response = await fetch(`/api/projects/${projectId}`, {
        body: JSON.stringify(patch),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error ?? "Could not save intake.");
        return;
      }
      setProject(payload.project);
      setMessage("Saved. Downstream outputs were cleared so the next run uses your updated answers.");
    });
  }
  return (
    <ProjectPageShell active="intake" project={project} projectId={projectId}>
      <header className="vf-workspace-page-header">
        <div><p className="vf-section-label">Optional detailed view</p><h1>Detailed answers</h1><p>Most people can use the step-by-step Builder. Open this form only when you want to review many answers at once.</p></div>
        <a className="vf-button vf-button-primary" href={`/project/${projectId}/builder`}>Use step-by-step Builder</a>
      </header>
      <section className="vf-workspace-guided-callout">
        <strong>Prefer one question at a time?</strong>
        <p>The Builder explains each question, gives examples, and lets you say “I’m not sure yet” where it is safe to keep moving.</p>
        <a href={`/project/${projectId}/builder`}>Go to the step-by-step Builder</a>
      </section>
      <details className="vf-advanced-form">
        <summary>Show the detailed answer form</summary>
        <p>This is an advanced editing view. You can leave fields blank and come back later.</p>
        <form className="vf-workspace-form vf-intake-form" onSubmit={save}>
          <PrivacySafetyNotice compact />
          <FormSection title="Your business idea">
            <Field defaultValue={idea.businessName} help="A working name is fine. You can change it later." label="Business name" name="businessName" />
            <TextArea defaultValue={idea.businessIdea} help="Your plain-language idea gives every planning draft a starting point." label="Describe the idea" name="businessIdea" />
            <Field defaultValue={idea.productOrService} help="List the main thing customers may pay for." label="Product or service" name="productOrService" />
            <Field defaultValue={idea.customerProblem} help="What need, frustration, or goal could make someone buy?" label="Customer problem" name="customerProblem" />
            <Field defaultValue={idea.proposedSolution} help="How may your offer help with that problem?" label="Your possible solution" name="proposedSolution" />
            <Field defaultValue={idea.targetCustomer} help="Start with the first kind of person or business most likely to buy." label="First customer group" name="targetCustomer" />
          </FormSection>
          <FormSection title="Location and how customers buy">
            <Field defaultValue={idea.city} help="Local research and setup steps often depend on the city." label="City" name="city" />
            <Field defaultValue={idea.county} help="The county can affect local data and permit checks." label="County" name="county" />
            <Field defaultValue={idea.state} help="Use the two-letter code, such as AZ or PA." label="State code" name="state" />
            <Field defaultValue={idea.zipCode} help="ZIP code helps narrow neighborhood-level research." label="ZIP code" name="zipCode" />
            <label>How customers buy<small>The closest option helps estimate costs and possible permits.</small><select defaultValue={idea.businessModel} name="businessModel"><option value="">Not sure yet</option><option value="physical_location">Customers visit my location</option><option value="online">Customers buy online</option><option value="mobile">I go to customers</option><option value="home_based">I work from home</option><option value="hybrid">A mix of these</option><option value="service">I provide a service</option><option value="product">I sell products</option><option value="manufacturing">I make products</option></select></label>
            <Field defaultValue={idea.industry} help="A simple label such as childcare, food truck, or consulting is enough." label="Type of business" name="industry" />
            <Field defaultValue={idea.naicsGuess} help="Optional government industry code. Leave this blank if you do not know it." label="NAICS code guess (optional)" name="naicsGuess" />
          </FormSection>
          <FormSection title="Money and launch details">
            <Field defaultValue={idea.pricingIdea} help="A rough price helps create an editable money estimate." label="Possible price" name="pricingIdea" />
            <Field defaultValue={idea.expectedStartupCosts} help="Estimate only. Do not enter bank account details." label="Estimated startup costs" name="expectedStartupCosts" type="number" />
            <Field defaultValue={idea.fundingNeed} help="Describe any outside money you think you may need. This does not guarantee funding." label="Possible funding need" name="fundingNeed" />
            <Field defaultValue={idea.staffingPlan} help="Tell us whether you may work alone or hire help." label="People you may need" name="staffingPlan" />
            <Field defaultValue={idea.requiredEquipment.join(", ")} help="Separate items with commas. Rough answers are fine." label="Equipment you may need" name="requiredEquipment" />
            <Field defaultValue={idea.licensingConcerns.join(", ")} help="List any rules or permits you already know to verify." label="Rules or permits to check" name="licensingConcerns" />
            <Field defaultValue={idea.knownCompetitors.join(", ")} help="List businesses or other choices a customer could use instead." label="Other customer options" name="knownCompetitors" />
            <Field defaultValue={idea.websiteNeeds} help="Describe what a first website should help visitors do." label="Website needs" name="websiteNeeds" />
          </FormSection>
          <FormSection title="About you">
            <Field defaultValue={founder.founderName} help="Use the name you want on this planning project." label="Your name" name="founderName" />
            <Field defaultValue={founder.founderExperience} help="Any related work, hobby, or customer experience may matter." label="Related experience" name="founderExperience" />
            <Field defaultValue={founder.industryExperience} help="Tell us what you already know about this kind of business." label="Experience in this type of business" name="industryExperience" />
            <Field defaultValue={founder.skills.join(", ")} help="Separate skills with commas." label="Useful skills" name="skills" />
            <Field defaultValue={founder.availableStartupCapital} help="Estimate only. Do not enter bank account details." label="Money you can safely put in" name="availableStartupCapital" type="number" />
            <Field defaultValue={founder.desiredFundingAmount} help="Estimate only. Do not enter bank account details. Programs and lenders make final eligibility decisions." label="Outside money you may need" name="desiredFundingAmount" type="number" />
            <Field defaultValue={founder.weeklyAvailableHours} help="This helps make the roadmap realistic." label="Hours you can spend each week" name="weeklyAvailableHours" type="number" />
            <Field defaultValue={founder.launchTimeline} help="A rough goal such as 90 days is fine." label="When you hope to start" name="launchTimeline" />
            <label>Credit readiness<small>Your own rough view of whether a lender-ready credit review may need work. Choose not sure if needed.</small><select defaultValue={founder.creditReadinessSelfAssessment} name="creditReadinessSelfAssessment"><option value="">Not sure yet</option><option value="unknown">Not sure yet</option><option value="needs_work">May need work</option><option value="developing">Still building</option><option value="ready">May be ready to review</option></select></label>
            <label>Comfort with risk<small>Choose the closest fit. This helps keep suggested next steps realistic.</small><select defaultValue={founder.riskTolerance} name="riskTolerance"><option value="">Not sure yet</option><option value="conservative">Prefer smaller steps</option><option value="moderate">Comfortable with balanced steps</option><option value="growth_oriented">Comfortable testing faster growth</option></select></label>
          </FormSection>
          {message ? <p className="vf-form-message">{message}</p> : null}
          <button className="vf-button vf-button-primary" disabled={isPending} type="submit">{isPending ? "Saving..." : "Save detailed answers"}</button>
        </form>
      </details>
    </ProjectPageShell>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset><legend>{title}</legend><div>{children}</div></fieldset>;
}
function Field({ label, name, defaultValue, type = "text", help }: { label: string; name: string; defaultValue: string | number; type?: string; help: string }) {
  return <label>{label}<small>{help}</small><input defaultValue={defaultValue} name={name} type={type} /></label>;
}
function TextArea({ label, name, defaultValue, help }: { label: string; name: string; defaultValue: string; help: string }) {
  return <label>{label}<small>{help}</small><textarea defaultValue={defaultValue} name={name} rows={4} /></label>;
}
function text(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }
function list(form: FormData, name: string) { return text(form, name).split(",").map((item) => item.trim()).filter(Boolean); }
function number(form: FormData, name: string) { return Number(form.get(name) || 0); }
