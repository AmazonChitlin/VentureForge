# Business Concept Engine

`BusinessConceptEngine.generate(input)` is the deterministic second stage of
the VentureForge pipeline. It converts normalized founder and idea intake into
a structured business concept inside the shared `EngineResult` envelope.

The module does not call an LLM and does not claim market validation. Its small
NAICS helper uses mock keyword mappings to produce candidate classifications.
Any candidate must be checked against the official Census NAICS reference
before downstream data providers rely on it.
