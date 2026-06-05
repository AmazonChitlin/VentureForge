# Funding Engine

`FundingEngine.match(input)` deterministically scores funding readiness and
ranks possible research paths. It does not call an LLM, scrape program pages,
submit applications, or promise approval.

The readiness score covers:

- business-plan completeness
- financial-projection completeness
- owner contribution
- credit-readiness self-assessment
- collateral readiness
- proof of concept
- revenue evidence
- market-research quality
- use-of-funds clarity
- legal and entity readiness

The catalog contains all supported funding categories as static templates.
Every returned match is labeled `template_requires_verification`, links to an
official starting point, explains fit and non-fit reasons, lists documents and
next steps, and warns that the lender, investor, or program administrator makes
the final decision.

Ordinary small businesses receive a ranking preference for SBA, CDFI,
community-bank, and credit-union research paths. Venture capital appears only
when the founder explicitly marks the project as scalable and high-growth and
the model looks suitable for venture economics.
