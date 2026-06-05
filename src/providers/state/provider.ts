import { UnavailableProvider } from "@/providers/unavailable-provider";

export class StateProgramProvider extends UnavailableProvider {
  readonly id = "state-programs";
  readonly name = "State program resources";
  readonly sourceType = "public_web" as const;
  readonly officialUrl = "https://www.usa.gov/state-governments";
}
