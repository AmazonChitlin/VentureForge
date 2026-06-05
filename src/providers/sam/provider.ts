import { UnavailableProvider } from "@/providers/unavailable-provider";

export class SamGovProvider extends UnavailableProvider {
  readonly id = "sam";
  readonly name = "SAM.gov";
  readonly sourceType = "official_api" as const;
  readonly officialUrl = "https://sam.gov/";
}
