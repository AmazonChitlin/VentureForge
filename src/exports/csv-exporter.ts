import type { FundingMatchResult } from "@/engine/funding";
import type { LaunchRoadmap, LaunchRoadmapTask } from "@/engine/launch-roadmap";
import type { EngineResult } from "@/engine/shared/engine-result";
import { exportWarnings } from "@/exports/export-guardrails";
import type { ExportArtifact, ExportProvider } from "@/exports/export-provider";

type CsvExportInput =
  | { kind: "funding"; result: EngineResult<FundingMatchResult> }
  | { kind: "launch-roadmap"; result: EngineResult<LaunchRoadmap> };

export class CsvExporter implements ExportProvider<CsvExportInput> {
  readonly id = "spreadsheet-csv";
  readonly name = "CSV checklist exporter";

  async createArtifacts(input: CsvExportInput): Promise<ExportArtifact[]> {
    return [
      input.kind === "funding"
        ? {
            filename: "funding-checklist.csv",
            mediaType: "text/csv; charset=utf-8",
            contents: this.renderFundingChecklist(input.result),
          }
        : {
            filename: "launch-roadmap.csv",
            mediaType: "text/csv; charset=utf-8",
            contents: this.renderLaunchRoadmap(input.result),
          },
    ];
  }

  renderFundingChecklist(result: EngineResult<FundingMatchResult>): string {
    const warnings = exportWarnings(result);
    return toCsv(
      [
        "Opportunity",
        "Type",
        "Program nature",
        "Match score",
        "Source",
        "Official URL",
        "Why it may fit",
        "Why it may not fit",
        "Documents needed",
        "Next steps",
        "Deadline",
        "Amount range",
        "Risk notes",
        "Verification required",
        "Export warning",
      ],
      result.data.matches.map((match) => [
        match.opportunityName,
        match.type,
        match.programNature,
        match.matchScore,
        match.source,
        match.url,
        join(match.whyItFits),
        join(match.whyItMayNotFit),
        join(match.documentsNeeded),
        join(match.nextSteps),
        match.deadline,
        match.amountRange,
        join(match.riskNotes),
        match.officialSourceRequired ? "Yes" : "No",
        join(warnings),
      ]),
    );
  }

  renderLaunchRoadmap(result: EngineResult<LaunchRoadmap>): string {
    const warnings = exportWarnings(result);
    return toCsv(
      [
        "Time bucket",
        "Task",
        "Description",
        "Priority",
        "Status",
        "Dependencies",
        "KPI",
        "Evidence required",
        "Notes",
        "Export warning",
      ],
      roadmapTasks(result.data).map(({ bucket, task }) => [
        bucket,
        task.title,
        task.description,
        task.priority,
        task.status,
        join(task.dependency),
        task.KPI,
        join(task.evidenceRequired),
        join(task.notes),
        join(warnings),
      ]),
    );
  }
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function join(items: readonly (string | number)[]): string {
  return items.join(" | ");
}

function roadmapTasks(
  roadmap: LaunchRoadmap,
): { bucket: string; task: LaunchRoadmapTask }[] {
  return [
    ...withBucket("Today", roadmap.today),
    ...withBucket("This week", roadmap.thisWeek),
    ...withBucket("30 days", roadmap.thirtyDays),
    ...withBucket("60 days", roadmap.sixtyDays),
    ...withBucket("90 days", roadmap.ninetyDays),
    ...withBucket("6 months", roadmap.sixMonths),
    ...withBucket("12 months", roadmap.twelveMonths),
  ];
}

function withBucket(bucket: string, tasks: LaunchRoadmapTask[]) {
  return tasks.map((task) => ({ bucket, task }));
}

