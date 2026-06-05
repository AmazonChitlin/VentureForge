import type {
  DataProvider,
  ProviderInput,
  ProviderResult,
  ProviderSourceType,
} from "@/providers/provider";

export abstract class UnavailableProvider
  implements DataProvider<ProviderInput, never>
{
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly sourceType: ProviderSourceType;
  abstract readonly officialUrl: string;

  async fetch(_input: ProviderInput): Promise<ProviderResult<never>> {
    return {
      status: "unavailable",
      data: null,
      sources: [],
      confidence: 0,
      warnings: [
        `${this.name} live integration is not implemented yet. Configure and verify the connector before using ${this.officialUrl}.`,
      ],
      fetchedAt: new Date(),
      isMockData: false,
    };
  }
}
