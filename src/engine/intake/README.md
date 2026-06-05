# Intake engine

The intake engine is deterministic. It does not call an LLM or any downstream
business-development module.

`IntakeEngine.evaluate(input)` accepts a partial wizard draft, normalizes
missing values, scores eight completeness categories, and returns
`EngineResult<IntakeEvaluation>`.

Categories:

- idea clarity
- customer clarity
- location clarity
- business model clarity
- financial clarity
- founder fit clarity
- regulatory clarity
- market research readiness

Completeness measures whether the intake conversation is ready to advance. It
does not judge whether the business will succeed.
