export function NextBestQuestionCard({ questions }: { questions: string[] }) {
  if (questions.length === 0) {
    return null;
  }
  return (
    <section className="vf-next-questions">
      <h3>A few things we can figure out next</h3>
      <ul>
        {questions.slice(0, 3).map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ul>
    </section>
  );
}
