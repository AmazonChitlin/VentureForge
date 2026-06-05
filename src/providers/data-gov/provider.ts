import { UnavailableProvider } from "@/providers/unavailable-provider";

export class DataGovProvider extends UnavailableProvider {
  readonly id = "data-gov";
  readonly name = "Data.gov";
  readonly sourceType = "public_web" as const;
  readonly officialUrl = "https://data.gov/";
}
