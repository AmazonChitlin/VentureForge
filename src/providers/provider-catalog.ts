import type { ProviderSourceType } from "@/providers/provider";

export interface ProviderDescriptor {
  id: string;
  name: string;
  sourceType: ProviderSourceType;
  status: "live" | "scaffold";
  officialUrl?: string;
}

export const providerCatalog = [
  provider("mock-market-data", "Mock market data", "mock", "live"),
  provider("manual-research", "Manual research", "manual", "live"),
  provider("sba-resources", "SBA resources", "public_web", "live", "https://www.sba.gov/"),
  provider("census", "Census Data API", "official_api", "live", "https://www.census.gov/data/developers.html"),
  provider("bls", "BLS Public Data API", "official_api", "live", "https://www.bls.gov/developers/"),
  provider("data-gov", "Data.gov", "public_web", "scaffold", "https://data.gov/"),
  provider("grants", "Grants.gov", "official_api", "scaffold", "https://www.grants.gov/"),
  provider("sam", "SAM.gov", "official_api", "scaffold", "https://sam.gov/"),
  provider("state-programs", "State program resources", "public_web", "scaffold", "https://www.usa.gov/state-governments"),
] satisfies ProviderDescriptor[];

function provider(
  id: string,
  name: string,
  sourceType: ProviderSourceType,
  status: ProviderDescriptor["status"],
  officialUrl?: string,
): ProviderDescriptor {
  return { id, name, sourceType, status, officialUrl };
}
