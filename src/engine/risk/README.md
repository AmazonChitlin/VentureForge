# Risk and Contingency Engine

`RiskEngine.generate(input)` creates a deterministic, monitored risk register.
It does not call an LLM and does not promise that contingencies will remove
business risk.

The engine always returns:

- 14 risk categories with likelihood, impact, warning signs, mitigations,
  fallback plans, owners, review cadences, and evidence
- priority risks with elevated exposure
- eight contingency scenarios with triggers and immediate actions
- assumptions, missing information, warnings, source references, and next
  actions through `EngineResult<RiskRegister>`

When available, the register consumes feasibility scores, financial funding-gap
and runway calculations, and strategy threats. Intake still provides a useful
baseline when later pipeline stages are missing.
