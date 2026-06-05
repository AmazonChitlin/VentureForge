export function ExampleAnswerButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="vf-button vf-button-secondary vf-example" onClick={onClick} type="button">
      Use example answer
    </button>
  );
}
