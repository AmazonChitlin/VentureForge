# Provider boundaries

Provider folders expose a stable contract for market-research orchestration.

- `mock`: development-only labeled sample values
- `manual`: founder-entered research and source notes
- `sba`: curated official SBA resource registry and source references
- `census`: live Census API connector for ACS profile, County Business
  Patterns, and Nonemployer Statistics indicators
- `bls`: live BLS API connector for LAUS labor-market series and CES wage
  pressure indicators
- `data-gov`: Data.gov connectors
- `grants`: Grants.gov connectors
- `sam`: SAM.gov connectors
- `state`: official state and local resource packs

Every implementation returns status, source records, confidence, warnings, a
fetch timestamp, and an explicit mock-data flag. Scaffold connectors return an
unavailable status until live integration work is completed. A provider must
never present mock values as official data.

The SBA provider uses `src/knowledge/resources/sba-resources.json` instead of
aggressive scraping. It returns curated official resource records for business
plans, market research, startup-cost planning, funding, launch guidance, and
SBA resource partners. These records are official references, not live data or
eligibility determinations.

The Census provider requires `CENSUS_API_KEY`. If the key is missing or the
requested geography cannot be resolved, it returns an unavailable result with a
plain warning so the market engine can fall back to mock or manual research.

The BLS provider requires `BLS_API_KEY`. If the key is missing or the requested
state/metro cannot be resolved, it returns an unavailable result with a plain
warning. Current live coverage focuses on Local Area Unemployment Statistics
and a national Current Employment Statistics hourly-earnings series; detailed
OEWS occupational wage tables remain a future connector expansion.
