# Engine boundaries

Each directory owns one pipeline stage. Future modules implement the shared
`EngineModule<Input, Output>` contract and return an `EngineResult<T>`.

- `shared`: source records, engine results, and module contracts
- `intake`: founder and business-idea intake contracts
- `concept`: structured business-concept generation
- `feasibility`: opportunity scoring and validation gates
- `market-research`: sourced secondary and primary research
- `customer-analysis`: personas and customer discovery
- `competitor-analysis`: direct, indirect, and substitute analysis
- `strategy`: strategic analysis and positioning
- `execution`: initiatives, dependencies, and deployment planning
- `business-plan`: plan sections and export-ready narratives
- `financials`: editable assumptions and projections
- `funding`: readiness and possible funding pathways
- `state-programs`: state and local official-resource checklists
- `launch-roadmap`: staged launch tasks
- `risk`: monitored risks and contingencies
- `website`: website content and static package generation
- `plugins`: engine-level extension points

React components must consume engine results through server-side services or
API boundaries. They must not contain business-development rules.
