import type { LaunchComplianceTask } from "@/engine/state-programs";

export function StateChecklistTable({ tasks }: { tasks: LaunchComplianceTask[] }) {
  return (
    <section className="vf-table-card">
      <h3>Setup checklist to verify</h3>
      <p className="vf-table-warning">
        Verify every state and local requirement with the listed official
        agency before filing, signing a lease, spending money, or launching.
      </p>
      <div className="vf-table-scroll">
        <table>
          <thead>
            <tr><th>Task</th><th>Agency</th><th>When</th><th>Difficulty</th><th>Source</th></tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <strong>{task.task}</strong>
                  {task.needsVerification ? <span className="vf-status is-needs-work">Needs verification</span> : null}
                  <small>{task.description}</small>
                </td>
                <td>{task.agency}</td>
                <td>{task.whenNeeded}</td>
                <td>{task.estimatedDifficulty}</td>
                <td>
                  {task.officialUrl ? (
                    <a href={task.officialUrl} rel="noreferrer" target="_blank">Open official resource</a>
                  ) : (
                    <span className="vf-status is-needs-work">No single official URL</span>
                  )}
                  <small>Last checked: {formatDate(task.lastVerifiedAt)}</small>
                  <small>{task.verifyWithAgencyWarning}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}
