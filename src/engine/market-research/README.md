# Market Research Engine

`MarketResearchEngine.generate(input, options)` orchestrates injected data
providers and returns a sourced report through the shared `EngineResult`
envelope. When `CENSUS_API_KEY` and/or `BLS_API_KEY` are configured, the
default provider chain tries official Census and BLS data first and keeps
development-only mock data available as a fallback. Without live-data keys,
sample projects still work through clearly labeled mock data.

Every invented value from the mock provider carries a `mock` label. Scaffold
providers return an unavailable status with a helpful warning. The engine
continues when a provider is unavailable or throws, records the provider run,
and lowers research confidence when evidence is missing.

The Census connector normalizes ACS 5-year profile indicators, County Business
Patterns establishment counts, and Nonemployer Statistics where available.
Those official indicators are still secondary research; they do not replace
customer interviews, local competitor checks, or pricing validation.

The BLS connector normalizes Local Area Unemployment Statistics labor-market
series and a Current Employment Statistics wage-pressure series where
available. These indicators inform hiring, wage, and local economic context;
they do not prove demand or guarantee labor availability.
