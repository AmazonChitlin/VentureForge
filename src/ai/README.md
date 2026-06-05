# AI boundary

Optional AI assistance lives behind `LLMClient`. The deterministic engines
remain authoritative and fully usable when no API key is configured.

The shared service runner:

- accepts structured input only
- loads one short domain prompt from the allowlisted prompt catalog
- requests structured JSON from the centralized client
- parses and validates output with Zod
- rejects unsupported certainty, superiority, approval, and funding language
- rejects source references that were not supplied as input
- adds AI-source labels and review warnings
- provides a safe fallback helper that preserves deterministic output

`MockLLMClient` supports local tests. `OpenAICompatibleLLMClient` is the
server-side connector scaffold for compatible chat-completion APIs. UI
components must not call an LLM client directly.
