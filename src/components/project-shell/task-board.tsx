export function TaskBoard({
  tasks,
  title = "Tasks",
}: {
  tasks: any[];
  title?: string;
}) {
  return (
    <section className="vf-task-board">
      <h3>{title}</h3>
      <div>
        {tasks.map((task, index) => (
          <article key={task.key ?? task.initiativeKey ?? task.category ?? `${title}-${index}`}>
            <span>{task.priority ?? task.impact ?? task.status ?? "planned"}</span>
            <h4>{task.title}</h4>
            <p>{task.description}</p>
            {task.KPI ? <small>How to measure progress: {task.KPI}</small> : null}
            {task.dependency?.length ? <small>Depends on: {task.dependency.join(", ")}</small> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
