import { UnavailableProvider } from "@/providers/unavailable-provider";

export class GrantsProvider extends UnavailableProvider {
  readonly id = "grants";
  readonly name = "Grants.gov";
  readonly sourceType = "official_api" as const;
  readonly officialUrl = "https://www.grants.gov/";
}
