# Financial Engine

`FinancialEngine.generate(input)` is a deterministic planning calculator. It
returns an `EngineResult<FinancialProjection>` and does not call an LLM.

The input remains editable. The result includes:

- explicit user inputs and labeled placeholder assumptions
- formulas on calculated rows and metrics
- reconciled startup uses and sources of funds
- 12-month profit/loss and cash-flow forecasts
- a three-year forecast
- break-even, margin, runway, and funding-gap calculations
- conservative, expected, and optimistic scenarios
- sensitivity checks for sales volume, rent, and variable costs

`startupCosts` and `fixedMonthlyCosts` are summary totals. The engine reconciles
them against itemized costs and uses the larger value if an itemized list would
otherwise be understated. This keeps inputs transparent without double-counting
equipment, inventory, licenses, rent, payroll, or other listed expenses.
